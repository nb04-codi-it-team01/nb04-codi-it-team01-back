export type FindDashboardResponseDto = {
  today: Today;
  week: Week;
  month: Month;
  year: Year;
  topSales: TopSales[];
  priceRange: PriceRangeDto[];
};

export type Today = {
  current: TotalCheck;
  previous: TotalCheck;
  changeRate: TotalCheck;
};

export type Week = {
  current: TotalCheck;
  previous: TotalCheck;
  changeRate: TotalCheck;
};

export type Month = {
  current: TotalCheck;
  previous: TotalCheck;
  changeRate: TotalCheck;
};

export type Year = {
  current: TotalCheck;
  previous: TotalCheck;
  changeRate: TotalCheck;
};

export type TotalCheck = {
  totalOrders: number;
  totalSales: number;
};

export type TopSales = {
  totalOrders: number;
  products: TopSaleProduct;
};

export type TopSaleProduct = {
  id: string;
  name: string;
  price: number;
};

export type PriceRangeDto = {
  priceRange: string;
  totalSales: number;
  percentage: number;
};
