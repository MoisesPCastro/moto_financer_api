import { IsDateString, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateEntryDto {
  @IsDateString()
  date: Date;

  @IsString()
  dayOfWeek: string; // "segunda", "terça", etc

  @IsNumber()
  @Min(0)
  grossAmount: number; // Ganho bruto

  @IsNumber()
  @Min(0)
  expenses: number; // Gastos

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  userId: string; // ID do usuário
}