import { Module } from '@nestjs/common';
import { VisualSearchController } from './visual-search.controller';
import { VisualSearchService } from './visual-search.service';

@Module({ controllers: [VisualSearchController], providers: [VisualSearchService] })
export class VisualSearchModule {}
