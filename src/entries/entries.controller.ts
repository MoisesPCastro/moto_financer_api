import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { format, isValid } from 'date-fns';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { SimpleTokenGuard } from '../common/guards/api-token.guard';

@Controller('entries')
@UseGuards(SimpleTokenGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  create(@Body() createEntryDto: CreateEntryDto) {
    return this.entriesService.create(createEntryDto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.entriesService.findAll(userId, skip, take);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entriesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEntryDto: UpdateEntryDto) {
    return this.entriesService.update(id, updateEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entriesService.remove(id);
  }

  @Get('reports/weekly')
  getWeeklySummary(
    @Query('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.entriesService.getWeeklySummary(userId, startDate, endDate);
  }

  @Get('reports/monthly')
  getMonthlySummary(
    @Query('userId') userId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.entriesService.getMonthlySummary(userId, year, month);
  }

  @Get('reports/stats/:userId')
  getUserStats(@Param('userId') userId: string) {
    return this.entriesService.getUserStats(userId);
  }

  @Get('reports/recent/:userId')
  getRecentEntries(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(7), ParseIntPipe) limit: number,
  ) {
    return this.entriesService.getRecentEntries(userId, limit);
  }

  @Get('reports/by-day/:userId')
  getSummaryByDay(
    @Param('userId') userId: string,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
    @Query(
      'month',
      new DefaultValuePipe(new Date().getMonth() + 1),
      ParseIntPipe,
    )
    month: number,
  ) {
    return this.entriesService
      .getMonthlySummary(userId, year, month)
      .then((result) => result.byDayOfWeek);
  }

  @Get('stats/:userId/filtered')
  async getUserStatsFiltered(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.entriesService.getUserStatsFiltered(userId, startDate, endDate);
  }

  @Get('day/details')
  async getDayDetails(
    @Query('date') dateParam: string,
    @Query('userId') userId?: string,
  ) {
    if (!dateParam) {
      throw new BadRequestException('Date parameter is required');
    }

    // ✅ parse manual (timezone-safe)
    const [year, month, day] = dateParam.split('-').map(Number);

    if (!year || !month || !day) {
      throw new BadRequestException(
        `Invalid date format. Please use YYYY-MM-DD. Received: ${dateParam}`,
      );
    }

    const date = new Date(year, month - 1, day);

    const dayDetails = await this.entriesService.getDayDetails(date, userId);

    if (!dayDetails) {
      throw new NotFoundException(
        `Nenhum registro encontrado para a data ${dateParam}`,
      );
    }

    return dayDetails;
  }

  @Get('recent/summary')
  async getRecentDaysSummary(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('userId') userId?: string,
  ) {
    return this.entriesService.getRecentDaysSummary(days, userId);
  }
}
