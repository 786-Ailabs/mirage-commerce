export default function OrderConfirmation({ order, onContinueShopping, onViewAdmin }) {
  if (!order) return null;
  const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <main className="confirmation-page">
      <section className="confirmation-card">
        <div className="success-mark">OK</div>
        <span className="eyebrow">Order confirmed</span>
        <h1>Thank you, {order.customer?.name || "Customer"}</h1>
        <p>Your Miraje grocery order has been created and sent to the store team for fulfilment.</p>

        <div className="confirmation-grid">
          <div><span>Order ID</span><strong>{order.id}</strong></div>
          <div><span>Total</span><strong>INR {order.total}</strong></div>
          <div><span>Items</span><strong>{itemCount}</strong></div>
          <div><span>Status</span><strong>{order.status}</strong></div>
          <div><span>Delivery Slot</span><strong>{order.customer?.deliverySlot || "Not selected"}</strong></div>
          <div><span>Payment</span><strong>{order.paymentMode || "Cash on Delivery"}</strong></div>
        </div>

        <div className="delivery-card">
          <span className="eyebrow">Delivery address</span>
          <strong>{order.customer?.phone || "No phone"}</strong>
          <p>{order.customer?.address || "No address added"}</p>
          {order.customer?.note && <em>{order.customer.note}</em>}
        </div>

        <div className="confirmation-actions">
          <button className="checkout-button" onClick={onContinueShopping}>Continue Shopping</button>
          <button className="ghost-button" onClick={onViewAdmin}>View Store Admin</button>
        </div>
      </section>
    </main>
  );
}
