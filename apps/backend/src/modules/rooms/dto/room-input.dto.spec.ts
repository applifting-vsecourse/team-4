import { RoomInputDto } from '@/modules/rooms/dto/room-input.dto';
import { ValidationPipe } from '@nestjs/common';

// The pipe of RoomsController, so malformed bodies are judged as over HTTP.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (body: unknown): Promise<unknown> =>
  pipe.transform(body, { type: 'body', metatype: RoomInputDto });

const TERM = '0190c0de-0000-7000-8000-000000000011';
const valid = {
  termId: TERM,
  isAvailable: true,
  baseBeds: 2,
  extraBeds: 0,
};

describe('RoomInputDto', () => {
  it('accepts a room with settings for terms', async () => {
    await expect(
      validate({ label: ' Chatka ', terms: [valid] }),
    ).resolves.toMatchObject({ label: 'Chatka' });
    await expect(validate({ label: 'Půda', terms: [] })).resolves.toBeDefined();
  });

  it.each([
    ['null', [null]],
    ['a string', ['T1']],
    ['a number', [1]],
    ['a nested list', [[valid]]],
    ['an empty object', [{}]],
    ['two empty objects', [{}, {}]],
    ['a valid and a null term', [valid, null]],
    ['a missing list', undefined],
    ['null instead of a list', null],
    ['an object instead of a list', {}],
    ['a repeated term', [valid, { ...valid, baseBeds: 3 }]],
    ['an unknown field', [{ ...valid, bedCount: 1 }]],
  ])('refuses terms given as %s with a validation error', async (_, terms) => {
    await expect(validate({ label: 'Chatka', terms })).rejects.toMatchObject({
      status: 400,
    });
  });
});
