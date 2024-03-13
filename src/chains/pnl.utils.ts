export function calculate(balance: string, price: number | undefined){
    if(price === undefined)
        return null
    const result = +balance * price;
    return +result.toFixed(2)
}