import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // <--- MUY IMPORTANTE: Debes exportarlo
})
export class EmailModule {}