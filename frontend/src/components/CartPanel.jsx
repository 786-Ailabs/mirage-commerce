import { useState } from "react";

const emptyCustomer = { name: "", phone: "", address: "", deliverySlot: "Today 6 PM - 9 PM", paymentMode: "Cash on Delivery", note: "" };

export default function CartPanel({ cart, onInc, onDec, onClear, onCheckout }) {
  const [customer, setCustomer] = useState(emptyCustomer);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = subtotal >= 499 || subtotal === 0 ? 0 : 35;
  const total = subtotal + delivery;
  const canCheckout = cart.length > 0 && customer.name.trim() && customer.phone.trim() && customer.address.trim();

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function submitCheckout() {
    if (!canCheckout) return;
    onCheckout(total, customer);
    setCustomer(emptyCustomer);
  }

  return (
    <aside className="cart-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Basket</span>
          <h2>Current Cart</h2>
        </div>
        <button className="ghost-button" onClick={onClear}>Clear</button>
      </div>

      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="empty-cart">Add products to start a Mirage order.</div>
        ) : (
          cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.unit} - INR {item.price}</span>
              </div>
              <div className="qty-control">
                <button onClick={() => onDec(item.id)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => onInc(item.id)}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="checkout-form">
        <span className="eyebrow">Customer details</span>
        <input placeholder="Customer name" value={customer.name} onChange={(event) => updateCustomer("name", event.target.value)} />
        <input placeholder="Phone number" value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} />
        <textarea placeholder="Delivery address" value={customer.address} onChange={(event) => updateCustomer("address", event.target.value)} />
        <select value={customer.deliverySlot} onChange={(event) => updateCustomer("deliverySlot", event.target.value)}>
          <option>Today 6 PM - 9 PM</option>
          <option>Tomorrow 8 AM - 11 AM</option>
          <option>Tomorrow 12 PM - 3 PM</option>
          <option>Tomorrow 6 PM - 9 PM</option>
        </select>
        <select value={customer.paymentMode} onChange={(event) => updateCustomer("paymentMode", event.target.value)}>
          <option>Cash on Delivery</option>
          <option>UPI</option>
          <option>Card</option>
          <option>Wallet</option>
          <option>Bank Transfer</option>
        </select>
        <input placeholder="Order note optional" value={customer.note} onChange={(event) => updateCustomer("note", event.target.value)} />
      </div>

      <div className="totals-card">
        <div><span>Subtotal</span><strong>INR {subtotal}</strong></div>
        <div><span>Delivery</span><strong>{delivery ? `INR ${delivery}` : "Free"}</strong></div>
        <div className="grand-total"><span>Total</span><strong>INR {total}</strong></div>
      </div>

      <button className="checkout-button" disabled={!canCheckout} onClick={submitCheckout}>
        Place Order
      </button>
    </aside>
  );
}

