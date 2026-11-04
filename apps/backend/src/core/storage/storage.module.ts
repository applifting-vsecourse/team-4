import { Module } from '@nestjs/common';
import { ObjectStorage } from './object-storage.service';

@Module({
  providers: [ObjectStorage],
  exports: [ObjectStorage],
})
export class StorageModule {}
