
export class CurrencyService {
    // Mock Exchange Rates (Base: INR)
    private static rates: { [key: string]: number } = {
        'INR': 1,
        'USD': 0.012, // 1 INR = 0.012 USD (approx 83 INR = 1 USD)
        'EUR': 0.011,
        'GBP': 0.0095,
        'JPY': 1.8
    };

    static convertPrice(amountInINR: number, targetCurrency: string): number {
        const rate = this.rates[targetCurrency] || 1;
        return parseFloat((amountInINR * rate).toFixed(2));
    }

    static formatPrice(amount: number, currency: string, locale: string = 'en-US'): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
}
