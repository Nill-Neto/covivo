import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { group_id } = await req.json();
    if (!group_id) {
      return new Response(JSON.stringify({ error: "group_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: memberData, error: memberError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const [groupRes, expensesRes, balancesRes, paymentsRes] = await Promise.all([
      supabase.from("groups").select("name").eq("id", group_id).single(),
      supabase
        .from("expenses")
        .select("title, amount, category, expense_type, created_at, purchase_date")
        .eq("group_id", group_id)
        .gte("purchase_date", startOfMonth)
        .lte("purchase_date", endOfMonth)
        .order("purchase_date"),
      supabase.rpc("get_member_balances", { _group_id: group_id }),
      supabase
        .from("payments")
        .select("amount, status, created_at")
        .eq("group_id", group_id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth),
    ]);

    const groupName = groupRes.data?.name ?? "República";
    const expenses = expensesRes.data ?? [];
    const balances = balancesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalPayments = payments.filter((p: any) => p.status === "confirmed").reduce((s: number, p: any) => s + Number(p.amount), 0);

    const userIds = balances.map((b: any) => b.user_id);
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
    }

    const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 50;
    const margin = 50;
    const fontSize = 10;
    const lineHeight = 14;

    const checkPageBreak = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage();
        y = height - margin;
      }
    };

    const drawLine = (text: string, f = font, size = fontSize) => {
      checkPageBreak(size + 5);
      page.drawText(text, { x: margin, y, size, font: f });
      y -= (size + 5);
    };

    drawLine(`RELATÓRIO MENSAL - ${groupName.toUpperCase()}`, fontBold, 18);
    y -= 10;
    drawLine(`Período: ${monthName}`, font, 12);
    drawLine(`Gerado em: ${now.toLocaleDateString("pt-BR")}`, font, 12);
    y -= 20;

    drawLine("RESUMO", fontBold, 14);
    drawLine(`Total de despesas: R$ ${totalExpenses.toFixed(2)}`);
    drawLine(`Pagamentos confirmados: R$ ${totalPayments.toFixed(2)}`);
    drawLine(`Número de despesas: ${expenses.length}`);
    y -= 20;

    drawLine("DESPESAS DO MÊS", fontBold, 14);
    if (expenses.length === 0) {
      drawLine("Nenhuma despesa registrada neste período.");
    } else {
      for (const e of expenses) {
        const date = new Date(e.purchase_date || e.created_at).toLocaleDateString("pt-BR");
        const type = e.expense_type === "collective" ? "Coletiva" : "Individual";
        const title = e.title.length > 40 ? e.title.substring(0, 40) + "..." : e.title;
        const text = `${date} | R$ ${Number(e.amount).toFixed(2)} | ${type} | ${title}`;
        drawLine(text);
      }
    }
    y -= 20;

    drawLine("SALDOS POR MORADOR", fontBold, 14);
    if (balances.length === 0) {
       drawLine("Nenhum saldo calculado.");
    } else {
      for (const b of balances) {
        checkPageBreak(60); // block height
        const name = nameMap[b.user_id] || "Desconhecido";
        drawLine(`Morador: ${name}`);
        drawLine(`  - Total Pago: R$ ${Number(b.total_paid).toFixed(2)}`);
        drawLine(`  - Total Devido: R$ ${Number(b.total_owed).toFixed(2)}`);
        drawLine(`  - Saldo Final: R$ ${Number(b.balance).toFixed(2)}`, fontBold);
        y -= 10;
      }
    }

    const base64 = await pdfDoc.saveAsBase64({ dataUri: false });

    return new Response(JSON.stringify({ pdf: base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Report error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
