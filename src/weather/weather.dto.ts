export interface WeatherDto {
  date: Date;
  name: string;
  weather: { main: string; description: string };
  main: { temp: number; feelsLike: number; humidity: number };
  clouds: { all: number };
  wind: { speed: number; deg: number };
  snow: { '1h': number; '3h': number };
  rain: { '1h': number; '3h': number };
}
