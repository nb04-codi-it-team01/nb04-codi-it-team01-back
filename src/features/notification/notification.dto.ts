export type NotificationDto = {
  id: string;
  userId: string;
  content: string;
  isChecked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationListDto = {
  list: NotificationDto[];
  totalCount: number;
};
