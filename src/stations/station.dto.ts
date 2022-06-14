export interface StationDto {
  date: Date;
  kioskId: number;
  name: string;
  totalDocks: number;
  docksAvailable: number;
  bikesAvailable: number;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  latitude: number;
  longitude: number;
  [otherField: string]: any;
}
