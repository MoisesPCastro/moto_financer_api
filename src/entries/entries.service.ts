import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Injectable()
export class EntriesService {
  constructor(private prisma: PrismaService) {}

  // CRIAR NOVO REGISTRO
  async create(createEntryDto: CreateEntryDto) {
    // 1. Verificar se o usuário existe
    const userExists = await this.prisma.user.findUnique({
      where: { id: createEntryDto.userId },
    });

    if (!userExists) {
      throw new NotFoundException(
        `Usuário com Email ${createEntryDto.userId} não encontrado`,
      );
    }

    // 2. Calcular netAmount
    const netAmount = createEntryDto.grossAmount - createEntryDto.expenses;

    // 3. Criar a entrada
    return this.prisma.entry.create({
      data: {
        date: new Date(createEntryDto.date),
        dayOfWeek: createEntryDto.dayOfWeek,
        grossAmount: createEntryDto.grossAmount,
        expenses: createEntryDto.expenses,
        netAmount: netAmount,
        userId: userExists.id,
      },
    });
  }

  // LISTAR TODOS OS REGISTROS (com filtros)
  async findAll(userId?: string, skip?: number, take?: number) {
    const where = userId ? { userId } : {};

    const [entries, total] = await Promise.all([
      this.prisma.entry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.entry.count({ where }),
    ]);

    return {
      entries,
      meta: {
        total,
        skip: skip || 0,
        take: take || entries.length,
      },
    };
  }

  // BUSCAR POR ID
  async findOne(id: string) {
    const entry = await this.prisma.entry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Registro com ID ${id} não encontrado`);
    }

    return entry;
  }

  // ATUALIZAR REGISTRO
  async update(id: string, updateEntryDto: UpdateEntryDto) {
    // Verifica se existe
    await this.findOne(id);

    // Cria objeto de dados com tipo explícito
    const data: any = { ...updateEntryDto };

    if (updateEntryDto.date) {
      data.date = new Date(updateEntryDto.date);
    }

    if (
      updateEntryDto.grossAmount !== undefined ||
      updateEntryDto.expenses !== undefined
    ) {
      // Busca valores atuais para calcular
      const current = await this.prisma.entry.findUnique({
        where: { id },
        select: { grossAmount: true, expenses: true },
      });

      const grossAmount = updateEntryDto.grossAmount ?? current.grossAmount;
      const expenses = updateEntryDto.expenses ?? current.expenses;
      data.netAmount = grossAmount - expenses;
    }

    return this.prisma.entry.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // REMOVER REGISTRO
  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.entry.delete({
      where: { id },
    });
  }

  // ========== RELATÓRIOS ==========

  // RESUMO SEMANAL
  async getWeeklySummary(userId: string, startDate: Date, endDate: Date) {
    const entries = await this.prisma.entry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const totals = entries.reduce(
      (acc, entry) => {
        acc.totalGross += entry.grossAmount;
        acc.totalExpenses += entry.expenses;
        acc.totalNet += entry.netAmount;
        return acc;
      },
      { totalGross: 0, totalExpenses: 0, totalNet: 0 },
    );

    // Agrupar por dia da semana
    const byDayOfWeek = entries.reduce((acc, entry) => {
      if (!acc[entry.dayOfWeek]) {
        acc[entry.dayOfWeek] = {
          grossAmount: 0,
          expenses: 0,
          netAmount: 0,
          count: 0,
        };
      }
      acc[entry.dayOfWeek].grossAmount += entry.grossAmount;
      acc[entry.dayOfWeek].expenses += entry.expenses;
      acc[entry.dayOfWeek].netAmount += entry.netAmount;
      acc[entry.dayOfWeek].count += 1;
      return acc;
    }, {});

    return {
      entries,
      totals,
      byDayOfWeek,
      daysCount: entries.length,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // RESUMO MENSAL
  async getMonthlySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Último dia do mês

    return this.getWeeklySummary(userId, startDate, endDate);
  }

  // ESTATÍSTICAS GERAIS DO USUÁRIO
  async getUserStats(userId: string) {
    const [totalEntries, sums, averages] = await Promise.all([
      this.prisma.entry.count({ where: { userId } }),

      this.prisma.entry.aggregate({
        where: { userId },
        _sum: {
          grossAmount: true,
          expenses: true,
          netAmount: true,
        },
      }),

      this.prisma.entry.aggregate({
        where: { userId },
        _avg: {
          grossAmount: true,
          expenses: true,
          netAmount: true,
        },
      }),
    ]);

    // Melhor dia (maior líquido)
    const bestDay = await this.prisma.entry.findFirst({
      where: { userId },
      orderBy: { netAmount: 'desc' },
      select: {
        date: true,
        dayOfWeek: true,
        grossAmount: true,
        expenses: true,
        netAmount: true,
      },
    });

    // Pior dia (menor líquido)
    const worstDay = await this.prisma.entry.findFirst({
      where: { userId },
      orderBy: { netAmount: 'asc' },
      select: {
        date: true,
        dayOfWeek: true,
        grossAmount: true,
        expenses: true,
        netAmount: true,
      },
    });

    return {
      totals: {
        entries: totalEntries,
        grossAmount: sums._sum.grossAmount || 0,
        expenses: sums._sum.expenses || 0,
        netAmount: sums._sum.netAmount || 0,
      },
      averages: {
        grossAmount: averages._avg.grossAmount || 0,
        expenses: averages._avg.expenses || 0,
        netAmount: averages._avg.netAmount || 0,
      },
      bestDay,
      worstDay,
    };
  }

  // ÚLTIMOS DIAS DE TRABALHO
  async getRecentEntries(userId: string, limit: number = 7) {
    return this.prisma.entry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        dayOfWeek: true,
        grossAmount: true,
        expenses: true,
        netAmount: true,
        description: true,
      },
    });
  }

  // src/entries/entries.service.ts
  async getUserStatsFiltered(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const entries = await this.prisma.entry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    if (entries.length === 0) {
      return {
        totals: { entries: 0, grossAmount: 0, expenses: 0, netAmount: 0 },
        averages: { grossAmount: 0, expenses: 0, netAmount: 0 },
        bestDay: null,
        worstDay: null,
      };
    }

    const totals = entries.reduce(
      (acc, entry) => ({
        entries: acc.entries + 1,
        grossAmount: acc.grossAmount + entry.grossAmount,
        expenses: acc.expenses + entry.expenses,
        netAmount: acc.netAmount + entry.netAmount,
      }),
      { entries: 0, grossAmount: 0, expenses: 0, netAmount: 0 },
    );

    const bestDay = entries.reduce((best, current) =>
      current.netAmount > best.netAmount ? current : best,
    );

    const worstDay = entries.reduce((worst, current) =>
      current.netAmount < worst.netAmount ? current : worst,
    );

    return {
      totals,
      averages: {
        grossAmount: totals.grossAmount / totals.entries,
        expenses: totals.expenses / totals.entries,
        netAmount: totals.netAmount / totals.entries,
      },
      bestDay: {
        date: bestDay.date,
        dayOfWeek: this.getDayOfWeek(bestDay.date),
        grossAmount: bestDay.grossAmount,
        expenses: bestDay.expenses,
        netAmount: bestDay.netAmount,
      },
      worstDay: {
        date: worstDay.date,
        dayOfWeek: this.getDayOfWeek(worstDay.date),
        grossAmount: worstDay.grossAmount,
        expenses: worstDay.expenses,
        netAmount: worstDay.netAmount,
      },
    };
  }

  private getDayOfWeek(date: Date): string {
    const days = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    return days[date.getDay()];
  }
}
