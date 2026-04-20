import type { Database } from "./types";

export type RpcName = keyof Database["public"]["Functions"];

export type RpcArgs<TName extends RpcName> = Database["public"]["Functions"][TName]["Args"];
export type RpcReturns<TName extends RpcName> = Database["public"]["Functions"][TName]["Returns"];

export interface AcceptInviteRpcResponse {
  success: boolean;
  error?: string;
  group_id?: string;
}

export interface RemoveGroupMemberRpcResponse {
  success: boolean;
  preserved_pending_splits?: number;
  redistributed_pending_splits?: number;
}

export type GetMemberBalancesRpcResponse = RpcReturns<"get_member_balances">;
export type GetGroupMemberPublicProfilesRpcResponse = RpcReturns<"get_group_member_public_profiles">;
export type GetAdminMemberCompetenceBalancesRpcResponse = RpcReturns<"get_admin_member_competence_balances">;
