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
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; font-size: 13px; }
            .container { max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
            .header h1 { color: #2c3e50; margin: 0; font-size: 28px; }
            .invoice-details { text-align: right; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .address-box { width: 45%; }
            .address-box h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 15px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f4f6f8; text-align: left; padding: 10px; border-bottom: 1px solid #ddd; font-weight: 600; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .totals { float: right; width: 45%; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; color: #000; }
            .footer { margin-top: 60px; text-align: center; font-size: 0.85em; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            .gst-tag { font-size: 11px; color: #666; }
            @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .container { border: none; padding: 0; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1>INVOICE</h1>
                    <p><strong>Handicraft Marketplace</strong><br>Digitally Generated Receipt</p>
                </div>
                <div class="invoice-details">
                    <p><strong>Invoice #:</strong> ${subOrder._id.toString().slice(-6).toUpperCase()}</p>
                    <p><strong>Date:</strong> ${formatDate(subOrder.createdAt)}</p>
                    <p><strong>Order ID:</strong> ${order._id.toString().slice(-8).toUpperCase()}</p>
                    <p><strong>Payment Mode:</strong> ${order.paymentMethod.toUpperCase()}</p>
                </div>
            </div>

            <div class="addresses">
                <div class="address-box">
                    <h3>Sold By</h3>
                    <p><strong>${subOrder.shopId.name}</strong></p>
                    <p>${subOrder.shopId.address || 'Address not available'}</p>
                    ${subOrder.shopId.businessDetails?.gstin ? `<p><strong>GSTIN:</strong> ${subOrder.shopId.businessDetails.gstin}</p>` : ''}
                    <p>Email: ${subOrder.shopId.contactEmail || 'N/A'}</p>
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
                        <th>Item Description</th>
                        <th>HSN/SAC</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${subOrder.items.map((item: any) => `
                    <tr>
                        <td>${item.title}</td>
                        <td>${item.productId?.hsnCode || 'N/A'}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>Taxable Value:</span>
                    <span>${formatCurrency(subOrder.subTotal)}</span>
                </div>
                <div class="total-row gst-tag">
                    <span>CGST (6%):</span>
                    <span>${formatCurrency(subOrder.subTotal * 0.06)}</span>
                </div>
                <div class="total-row gst-tag">
                    <span>SGST (6%):</span>
                    <span>${formatCurrency(subOrder.subTotal * 0.06)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>Grand Total:</span>
                    <span>${formatCurrency(subOrder.subTotal * 1.12)}</span>
                </div>
            </div>
            
            <div style="clear: both;"></div>

            <div class="footer">
                <p><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                <p>This is a computer-generated invoice and does not require a physical signature.</p>
                <p>&copy; ${new Date().getFullYear()} Handicraft Marketplace</p>
            </div>
        </div>
        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;
};
