import { GradeResponse } from './grade.dto';

export const GRADE_METADATA: GradeResponse[] = [
  {
    id: 'grade_green',
    name: 'Green',
    rate: 1,
    minAmount: 0,
  },
  {
    id: 'grade_orange',
    name: 'Orange',
    rate: 3,
    minAmount: 100_000,
  },
  {
    id: 'grade_red',
    name: 'Red',
    rate: 5,
    minAmount: 300_000,
  },
  {
    id: 'grade_black',
    name: 'Black',
    rate: 7,
    minAmount: 500_000,
  },
  {
    id: 'grade_vip',
    name: 'VIP',
    rate: 10,
    minAmount: 1_000_000,
  },
];
