import { X, MapPin, Phone, Mail, Calendar, Package } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { BakerOrder } from "@/api/baker";

interface OrderDetailsModalProps {
  order: BakerOrder;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-purple-100 text-purple-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const address = order.delivery_address;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/80 rounded-full p-2 hover:bg-[#FFF9F5] transition-colors z-10"
          >
            <X className="w-6 h-6 text-[#4E342E]" />
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-[#D35400] rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl text-[#4E342E]">Order Details</h2>
                  <p className="text-[#4E342E]/60">{order.order_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                {order.payment_status === "completed" && (
                  <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Paid
                  </span>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-[#FFF9F5] rounded-2xl p-6 mb-6 border-2 border-[#D35400]/10">
              <h3 className="text-lg font-medium text-[#4E342E] mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Mail className="w-5 h-5 text-[#D35400]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Name</p>
                    <p className="text-[#4E342E] font-medium">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Phone className="w-5 h-5 text-[#D35400]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Phone</p>
                    <p className="text-[#4E342E] font-medium">{order.customer_phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Calendar className="w-5 h-5 text-[#D35400]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Order Date</p>
                    <p className="text-[#4E342E] font-medium">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {address && (
              <div className="bg-[#F1F8E9] rounded-2xl p-6 mb-6 border-2 border-[#C8E6C9]">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#2E7D32]" />
                  <h3 className="text-lg font-medium text-[#4E342E]">Delivery Address</h3>
                </div>
                <div className="text-[#4E342E]">
                  <p className="font-medium">{address.fullName}</p>
                  <p className="text-[#4E342E]/70">{address.phone}</p>
                  <p className="text-[#4E342E]/70 mt-2">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </p>
                  <p className="text-[#4E342E]/70">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  {address.landmark && (
                    <p className="text-[#4E342E]/70 mt-1">Landmark: {address.landmark}</p>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-2xl p-6 border-2 border-[#D35400]/10 mb-6">
              <h3 className="text-lg font-medium text-[#4E342E] mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-[#FFF9F5] rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[#4E342E]">{item.product_name}</p>
                      <p className="text-sm text-[#4E342E]/60">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#D35400] font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-[#4E342E]/60">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-[#D35400]/10 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-[#4E342E]">Total Amount</span>
                  <span className="text-2xl font-bold text-[#D35400]">
                    ${order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={onClose}
                className="flex-1 bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 text-lg"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
