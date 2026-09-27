export interface FamilyMember {
  id: string;
  name: string;
  /** Optional short label shown in selects, e.g. "Me", "Wife" */
  label?: string;
  note?: string;
}
