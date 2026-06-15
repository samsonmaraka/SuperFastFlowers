import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { listProducts } from '@/lib/products-repo';
import { listVendors } from '@/lib/vendors-repo';
import { filterProductsForAdmin, filterVendorsForAdmin } from '@/lib/vendor-permissions';
import { ProductsTable } from '@/components/admin/products-table';
export default async function ProductsPage(){const access=await requireAnyAdminAccess();const [products,vendors]=await Promise.all([listProducts({includeInactive:true}),listVendors()]);return <ProductsTable initialProducts={filterProductsForAdmin(access,products)} vendors={filterVendorsForAdmin(access,vendors)} mode={access.mode}/>}
