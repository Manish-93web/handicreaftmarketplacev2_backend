export const getInvoiceHTML = (order: any, subOrder: any) => {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .header h1 { color: #2c3e50; margin: 0; }
            .invoice-details { text-align: right; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .address-box { width: 45%; }
            .address-box h3 { border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .totals { float: right; width: 40%; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .container { border: none; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1>INVOICE</h1>
                    <p>Handicraft Marketplace</p>
                </div>
                <div class="invoice-details">
                    <p><strong>Invoice #:</strong> INV-${subOrder._id.toString().slice(-6).toUpperCase()}</p>
                    <p><strong>Date:</strong> ${formatDate(subOrder.createdAt)}</p>
                    <p><strong>Order ID:</strong> ${order._id.toString().slice(-8).toUpperCase()}</p>
                </div>
            </div>

            <div class="addresses">
                <div class="address-box">
                    <h3>Sold By</h3>
                    <p><strong>${subOrder.shopId.name}</strong></p>
                    <p>${subOrder.shopId.address || 'Address not available'}</p>
                    <p>Email: ${subOrder.shopId.contactEmail}</p>
                </div>
                <div class="address-box">
                    <h3>Bill To</h3>
                    <p><strong>${order.shippingAddress.fullName}</strong></p>
                    <p>${order.shippingAddress.addressLine1}</p>
                    <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
                    <p>Phone: ${order.shippingAddress.mobileNumber}</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${subOrder.items.map((item: any) => `
                    <tr>
                        <td>${item.title}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(subOrder.subTotal)}</span>
                </div>
                <div class="total-row">
                    <span>Tax (12% approx):</span>
                    <span>${formatCurrency(subOrder.subTotal * 0.12)}</span>
                </div>
                <!-- Discount logic if applied at sub-order level could go here -->
                <div class="total-row grand-total">
                    <span>Total:</span>
                    <span>${formatCurrency(subOrder.subTotal * 1.12)}</span>
                </div>
            </div>
            
            <div style="clear: both;"></div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>This is a computer-generated invoice and does not require a signature.</p>
            </div>
        </div>
        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;
};
