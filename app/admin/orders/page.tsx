import { requireDashboardAccess } from '@/lib/admin-auth';
import { listOrders } from '@/lib/orders-repo';
import { listVendors } from '@/lib/vendors-repo';
import { filterOrdersForAdmin, filterVendorsForAdmin } from '@/lib/vendor-permissions';
import { OrdersTable } from '@/components/admin/orders-table';
export default async function OrdersPage(){const access=await requireDashboardAccess();const [orders,vendors]=await Promise.all([listOrders(),listVendors()]);return <OrdersTable initialOrders={filterOrdersForAdmin(access,orders)} vendors={filterVendorsForAdmin(access,vendors)} mode={access.mode}/>}
