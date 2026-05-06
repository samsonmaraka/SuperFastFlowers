import Link from 'next/link';
import { CheckoutClient } from '@/components/checkout-client';

const deliveryAreas = [
  { value: '213', label: 'Bakuli' },
  { value: '172', label: 'Banda' },
  { value: '439', label: 'Biina' },
  { value: '174', label: 'Bugolobi' },
  { value: '176', label: 'Bukasa' },
  { value: '197', label: 'Bukesa' },
  { value: '146', label: 'Bukoto' },
  { value: '236', label: 'Bulenga' },
  { value: '239', label: 'Bunamwaya' },
  { value: '177', label: 'Bunga' },
  { value: '192', label: 'Busega' },
  { value: '153', label: 'Butabika' },
  { value: '237', label: 'Buwate' },
  { value: '178', label: 'Buziga' },
  { value: '218', label: 'Bwaise' },
  { value: '156', label: 'Bweyogerere' },
  { value: '231', label: 'Central Business District' },
  { value: '310', label: 'Down Town Kampala' },
  { value: '179', label: 'Ggaba' },
  { value: '180', label: 'Kabalagala' },
  { value: '162', label: 'Kabojja' },
  { value: '214', label: 'Kabowa' },
  { value: '191', label: 'Kabuusu' },
  { value: '158', label: 'Kagoma' },
  { value: '219', label: 'Kalerwe' },
  { value: '142', label: 'Kampala Industrial Area' },
  { value: '139', label: 'Kamwokya' },
  { value: '181', label: 'Kansanga' },
  { value: '224', label: 'Kanyanya' },
  { value: '194', label: 'Kasubi' },
  { value: '182', label: 'Katwe' },
  { value: '445', label: 'Kavule' },
  { value: '215', label: 'Kawaala' },
  { value: '328', label: 'kawanda / Kagoma' },
  { value: '220', label: 'Kawempe' },
  { value: '212', label: 'Kazo' },
  { value: '241', label: 'Kibiri' },
  { value: '183', label: 'Kibuli' },
  { value: '184', label: 'Kibuye' },
  { value: '252', label: 'Kigowa' },
  { value: '225', label: 'Kikaya' },
  { value: '254', label: 'Kikoni' },
  { value: '253', label: 'Kinawataka' },
  { value: '238', label: 'Kira' },
  { value: '155', label: 'Kireka' },
  { value: '159', label: 'Kirinya' },
  { value: '152', label: 'Kirombe' },
  { value: '221', label: 'Kisaasi' },
  { value: '140', label: 'Kisenyi' },
  { value: '244', label: 'Kisugu' },
  { value: '251', label: 'Kitante' },
  { value: '195', label: 'Kitebi' },
  { value: '144', label: 'Kitintale' },
  { value: '154', label: 'Kiwatule' },
  { value: '138', label: 'Kololo' },
  { value: '168', label: 'Komamboga' },
  { value: '169', label: 'Kulambiro' },
  { value: '161', label: 'Kyaliwajjala' },
  { value: '170', label: 'Kyambogo' },
  { value: '145', label: 'Kyanja' },
  { value: '222', label: 'Kyebando' },
  { value: '235', label: 'Kyengera' },
  { value: '163', label: 'Lubowa' },
  { value: '216', label: 'Lubya' },
  { value: '164', label: 'Lugala' },
  { value: '223', label: 'Lugoba' },
  { value: '143', label: 'Lugogo' },
  { value: '200', label: 'Lusaze' },
  { value: '242', label: 'Luwafu' },
  { value: '151', label: 'Luzira' },
  { value: '165', label: 'Lweza' },
  { value: '157', label: 'Maganjo' },
  { value: '226', label: 'Makerere' },
  { value: '185', label: 'Makindye' },
  { value: '201', label: 'Masanafu' },
  { value: '247', label: 'Mbalwa' },
  { value: '147', label: 'Mbuya' },
  { value: '229', label: 'Mengo' },
  { value: '246', label: 'Mpanga' },
  { value: '227', label: 'Mpererwe' },
  { value: '228', label: 'Mulago' },
  { value: '186', label: 'Munyonyo' },
  { value: '203', label: 'Mutundwe' },
  { value: '148', label: 'Mutungo' },
  { value: '187', label: 'Muyenga' },
  { value: '249', label: 'Naalya' },
  { value: '173', label: 'Nabisunsa' },
  { value: '370', label: 'Nabweru' },
  { value: '171', label: 'Naguru' },
  { value: '166', label: 'Najjanankumbi' },
  { value: '167', label: 'Najjera' },
  { value: '136', label: 'Nakasero' },
  { value: '149', label: 'Nakawa' },
  { value: '141', label: 'Nakivubo' },
  { value: '208', label: 'Nalukolongo' },
  { value: '314', label: 'Namasuba' },
  { value: '196', label: 'Namirembe' },
  { value: '311', label: 'Namugongo' },
  { value: '199', label: 'Namungoona' },
  { value: '188', label: 'Namuwongo' },
  { value: '209', label: 'Nankulabye' },
  { value: '233', label: 'Nansana' },
  { value: '446', label: 'Nasser Road' },
  { value: '205', label: 'Nateete' },
  { value: '206', label: 'Ndeeba' },
  { value: '441', label: 'Ndejje' },
  { value: '189', label: 'Nsambya' },
  { value: '150', label: 'Ntinda' },
  { value: '217', label: 'Nyanama' },
  { value: '137', label: 'Old Kampala' },
  { value: '204', label: 'Rubaga' },
  { value: '190', label: 'Salaama' },
  { value: '248', label: 'Seguku' },
  { value: '312', label: 'Sonde' },
  { value: '207', label: 'Wakaliga' },
  { value: '211', label: 'Wandegeya' },
  { value: '210', label: 'Wankulukuku' },
  { value: '230', label: 'Zana' }
] as const;

function toDateInputValue(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export default function CheckoutPage() {
  const today = new Date();
  const minDeliveryDate = toDateInputValue(addDays(today, 2));
  const maxDeliveryDate = toDateInputValue(addDays(today, 14));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Checkout / Order request</h1>
      <p className="mb-5 text-gray-700">
        Payments are modular and can be enabled later. For MVP, submit your request and our team confirms availability.
      </p>
      <CheckoutClient>
      <form action="/api/orders" method="post" className="space-y-3 rounded-xl border bg-white p-6">
        <input
          name="recipientName"
          required
          placeholder="Name of recipient"
          className="w-full rounded border p-2"
        />
        <input
          name="recipientPhone"
          type="tel"
          required
          placeholder="Phone number of recipient"
          className="w-full rounded border p-2"
        />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">Choose day of delivery</span>
          <input
            name="deliveryDate"
            type="date"
            required
            min={minDeliveryDate}
            max={maxDeliveryDate}
            className="w-full rounded border p-2"
          />
          <span className="text-xs text-gray-600">Delivery date must be at least 2 days from today and within 14 days.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">Region</span>
          <select name="region" required className="w-full rounded border p-2" defaultValue="">
            <option value="" disabled>
              Please select
            </option>
            <option value="Kampala Region">Kampala Region</option>
            <option value="Entebbe area">Entebbe area</option>
          </select>
          <span className="text-xs text-gray-600">We only deliver to Kampala Region and Entebbe area for now.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">Area</span>
          <select required className="sel w-full rounded border p-2" id="fi-cityId" name="cityId" defaultValue="">
            <option value="" disabled>
              Please select
            </option>
            {deliveryAreas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </label>
        <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2" />
        <textarea name="note" placeholder="Gift note / preferences" className="w-full rounded border p-2" rows={5} />
        <button className="rounded bg-ink px-4 py-2 text-white">Send request</button>
      </form>
      </CheckoutClient>
      <p className="mt-6 text-sm text-gray-600">
        Need bulk orders?{' '}
        <Link href="/contact" className="text-pink-700">
          Contact us here.
        </Link>
      </p>
    </div>
  );
}
