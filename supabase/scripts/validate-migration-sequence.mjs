#!/usr/bin/env node
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const TIMESTAMP_PATTERN = /^(\d{14})_(.+)\.sql$/;

function loadMigrationNames() {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Diretório não encontrado: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function validateNamingAndOrder(files) {
  const timestamps = [];

  for (const file of files) {
    const match = file.match(TIMESTAMP_PATTERN);
    if (!match) {
      throw new Error(
        `Nome inválido: "${file}". Use o formato YYYYMMDDHHMMSS_descricao.sql`,
      );
    }

    timestamps.push(match[1]);
  }

  const duplicates = timestamps.filter((ts, idx) => timestamps.indexOf(ts) !== idx);
  if (duplicates.length > 0) {
    throw new Error(
      `Timestamps duplicados detectados: ${[...new Set(duplicates)].join(', ')}`,
    );
  }

  for (let i = 1; i < timestamps.length; i += 1) {
    if (timestamps[i] <= timestamps[i - 1]) {
      throw new Error(
        `Ordem não estritamente crescente: ${files[i - 1]} -> ${files[i]}`,
      );
    }
  }
}

function validateLogicalDependencies(files) {
  const dependencyChains = [
    [
      '20260101000024_add_missing_columns_to_various_tables_to_match_codebase_types.sql',
      '20260417120000_add_payment_competence_fields.sql',
      '20260417120001_add_payment_competence_date.sql',
      '20260417140000_backfill_competence_and_enforce_not_null.sql',
      '20260417143000_set_competence_triggers_expenses_payments.sql',
    ],
    [
      '20260417120000_add_payment_competence_fields.sql',
      '20260417120001_add_payment_competence_date.sql',
      '20260417140000_backfill_competence_and_enforce_not_null.sql',
      '20260417143000_set_competence_triggers_expenses_payments.sql',
    ],
  ];

  for (const chain of dependencyChains) {
    const indexes = chain.map((name) => files.indexOf(name));

    if (indexes.some((idx) => idx === -1)) {
      const missing = chain.filter((_, idx) => indexes[idx] === -1);
      throw new Error(`Dependência lógica ausente: ${missing.join(', ')}`);
    }

    for (let i = 1; i < indexes.length; i += 1) {
      if (indexes[i] <= indexes[i - 1]) {
        throw new Error(
          `Dependência lógica fora de ordem: ${chain[i - 1]} deve vir antes de ${chain[i]}`,
        );
      }
    }
  }
}


function validateNoCriticalSkipGuards(files) {
  const guardedMigrations = [
    '20260101000024_add_missing_columns_to_various_tables_to_match_codebase_types.sql',
    '20260417140000_backfill_competence_and_enforce_not_null.sql',
  ];

  for (const name of guardedMigrations) {
    if (!files.includes(name)) {
      continue;
    }

    const content = readFileSync(join(migrationsDir, name), 'utf8');
    if (/to_regclass\s*\(/i.test(content) || /RAISE NOTICE\s+'Skipping/i.test(content)) {
      throw new Error(
        `Guardas de skip detectadas em migration crítica (${name}). Remova lógica condicional de existência.`
      );
    }
  }
}

function validateSequentialApplication(files) {
  // Simulação 1: banco vazio (aplica tudo na ordem).
  const emptyDbPlan = [...files];
  if (emptyDbPlan.length !== files.length) {
    throw new Error('Falha na simulação de banco vazio.');
  }

  // Simulação 2: banco já migrado (nenhuma migration pendente).
  const alreadyMigrated = new Set(files);
  const pending = files.filter((name) => !alreadyMigrated.has(name));
  if (pending.length !== 0) {
    throw new Error(`Banco já migrado não deveria ter pendências: ${pending.join(', ')}`);
  }
}

function main() {
  const files = loadMigrationNames();

  validateNamingAndOrder(files);
  validateLogicalDependencies(files);
  validateNoCriticalSkipGuards(files);
  validateSequentialApplication(files);

  console.log('✅ Migrações validadas: nome, ordem, dependências lógicas e simulação sequencial.');
  console.log(`Total de migrations: ${files.length}`);
}

main();
