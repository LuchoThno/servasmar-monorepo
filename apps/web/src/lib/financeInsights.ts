import type { PipelineStage } from 'mongoose'

export const buildProjectProfitabilityPipeline = (limit: number): PipelineStage[] => [
  {
    $lookup: {
      from: 'incomes',
      localField: '_id',
      foreignField: 'projectId',
      as: 'incomes',
    },
  },
  {
    $lookup: {
      from: 'expenses',
      localField: '_id',
      foreignField: 'projectId',
      as: 'expenses',
    },
  },
  {
    $addFields: {
      totalIncome: {
        $sum: {
          $map: {
            input: '$incomes',
            as: 'income',
            in: {
              $cond: [{ $eq: ['$$income.status', 'active'] }, '$$income.amount', 0],
            },
          },
        },
      },
      totalExpense: {
        $sum: {
          $map: {
            input: '$expenses',
            as: 'expense',
            in: {
              $cond: [{ $eq: ['$$expense.status', 'anulado'] }, 0, '$$expense.amount'],
            },
          },
        },
      },
    },
  },
  {
    $project: {
      name: 1,
      code: 1,
      totalIncome: 1,
      totalExpense: 1,
      totalExpenses: '$totalExpense',
      utility: { $subtract: ['$totalIncome', '$totalExpense'] },
      margin: {
        $cond: [
          { $gt: ['$totalIncome', 0] },
          { $multiply: [{ $divide: [{ $subtract: ['$totalIncome', '$totalExpense'] }, '$totalIncome'] }, 100] },
          0,
        ],
      },
    },
  },
  { $sort: { utility: -1 as const } },
  { $limit: limit },
]

export const buildExpenseByCategoryPipeline = (): PipelineStage[] => [
  { $match: { status: { $in: ['pendiente', 'pagado'] } } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $sort: { total: -1 as const } },
]
