// app/preview/page.tsx

const stats = [
  { label: "Total Revenue", value: "$48,295", trend: "+12.5%", up: true },
  { label: "Active Users", value: "1,284", trend: "+4.3%", up: true },
  { label: "New Orders", value: "342", trend: "+8.1%", up: true },
  { label: "Churn Rate", value: "2.4%", trend: "-0.6%", up: false },
];

const orders = [
  { id: "#ORD-5521", customer: "Lena Fischer", amount: "$320.00", status: "Completed" },
  { id: "#ORD-5520", customer: "Marcus Webb", amount: "$89.50", status: "Pending" },
  { id: "#ORD-5519", customer: "Priya Nair", amount: "$204.00", status: "Completed" },
  { id: "#ORD-5518", customer: "Tom Harrington", amount: "$55.00", status: "Failed" },
  { id: "#ORD-5517", customer: "Aiko Tanaka", amount: "$740.00", status: "Completed" },
];

const products = [
  { name: "Pro Plan", units: 840, max: 1000 },
  { name: "Starter Pack", units: 620, max: 1000 },
  { name: "Enterprise Suite", units: 410, max: 1000 },
  { name: "Add-on Storage", units: 290, max: 1000 },
  { name: "Team Seats", units: 185, max: 1000 },
];

const activity = [
  { icon: "🧾", text: "New order #ORD-5521 placed by Lena Fischer", time: "2 min ago" },
  { icon: "👤", text: "Marcus Webb upgraded to Pro Plan", time: "18 min ago" },
  { icon: "⚠️", text: "Payment failed for order #ORD-5518", time: "1 hr ago" },
  { icon: "✅", text: "Monthly revenue report generated", time: "3 hr ago" },
];

function statusStyle(status: string) {
  if (status === "Completed") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
  if (status === "Pending") return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";
  return "bg-red-500/15 text-red-400 border border-red-500/20";
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Header */}
      <header className="bg-neutral-950 border-b border-neutral-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-neutral-100">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-neutral-400 hover:text-neutral-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button className="relative text-neutral-400 hover:text-neutral-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a5 5 0 0 1 5 5v2.5l1 2H2l1-2V6a5 5 0 0 1 5-5ZM6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-neutral-800">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white select-none">
              LF
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-neutral-200 leading-none">Lena Fischer</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Admin</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-neutral-500 hidden sm:block">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Overview</h1>
          <p className="text-sm text-neutral-500 mt-0.5">April 2026 · All workspaces</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-neutral-100 tracking-tight">{stat.value}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    stat.up
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {stat.up ? "↑" : "↓"} {stat.trend}
                </span>
                <span className="text-[10px] text-neutral-600">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders — wider */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-100">Recent Orders</h2>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                View all →
              </button>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4 uppercase tracking-wide">Order ID</th>
                    <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4 uppercase tracking-wide">Customer</th>
                    <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4 uppercase tracking-wide">Amount</th>
                    <th className="text-right text-xs font-medium text-neutral-500 pb-2 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {orders.map((order) => (
                    <tr key={order.id} className="group">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs text-neutral-400">{order.id}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-300 shrink-0">
                            {order.customer.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-neutral-200 text-xs">{order.customer}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="text-neutral-100 font-medium text-xs">{order.amount}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products — narrower */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-100">Top Products</h2>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Details →
              </button>
            </div>
            <div className="space-y-4">
              {products.map((product, i) => (
                <div key={product.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-600 w-3">{i + 1}</span>
                      <span className="text-xs font-medium text-neutral-200">{product.name}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{product.units.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(product.units / product.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-100">Recent Activity</h2>
            <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 leading-snug">{item.text}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
