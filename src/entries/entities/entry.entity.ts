export class Entry {
  id: string;
  date: Date;
  dayOfWeek: string;
  grossAmount: number;
  expenses: number;
  netAmount: number;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
