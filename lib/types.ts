export type OpeningHourDTO = {
  day: number;
  open: string;
  close: string;
  closed: boolean;
};

export type BusinessDTO = {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string;
  location: string;
  images: string[];
  openingHours: OpeningHourDTO[];
  ratingAvg: number;
  ratingCount: number;
  isOwner: boolean;
  isFavorite: boolean;
  createdAt: string;
};

export type ServiceDTO = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  active: boolean;
};

export type BusinessDetailDTO = BusinessDTO & { services: ServiceDTO[] };
export type BusinessWithServices = BusinessDTO & { services: ServiceDTO[] };

export type SlotDTO = { start: string; end: string };

export type AppointmentDTO = {
  id: string;
  businessId: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerName: string;
  start: string;
  end: string;
  durationMin: number;
  price: number;
  status: string;
  cancelReason: string;
  hasReview: boolean;
  createdAt: string;
};

export type ReviewDTO = {
  id: string;
  appointmentId: string;
  businessId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
