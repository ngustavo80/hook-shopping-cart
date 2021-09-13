import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product } from '../types'

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return []
    })

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart] //Faz com que updatedCart tenha o mesmo valor de cart e não seja uma referência mantendo a imutabilidade.
      const productExists = updatedCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`) //Busca no banco de dados o estoque do produto.
      
      const stockAmount = stock.data.amount // Quantidade do produto no estoque.
      const currentAmount = productExists ? productExists.amount : 0 // Quantidade atual do produto no carrinho, se existir o produto no carrinho a variável fica com o valor da quantidade do produto se não existir o produto a quantidade é 0
      const amount = currentAmount + 1

      if(amount > stockAmount) {
        //Se a quantidade desejada for maior que o estoque do produto precisa falhar e parar a execução do código com return
        toast.error('Quantidade solicitada fora de estoque')

        return
      }

      if(productExists) {
        // Se o produto existe, vai adicionar mais um a quantidade do produto no carrinho.
        productExists.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`) // Buscando os produtos no banco de dados.

        const newProduct = {
          ...product.data,
          amount: 1
        } // No banco de dados não tem a quantidade do produto na rota products, o amount fica na rota do estoque, então precisamos passar os dados do produto e adicionar o campo amount ao objeto e dar um push no array.
        
        updatedCart.push(newProduct)

      }
      
      setCart(updatedCart) // setCart a função no estado que atualiza o valor de cart.
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) // Salvando o carrinho no localStorage.
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId) // Verifica se o produto existe pelo id do produto.

      // O método findIndex retorna o valor -1 se não encontrar o index por isso a condiçao no if é a variável >= 0.
      if (productIndex >= 0) {
        // O método splice ele remove uma posição no array, passando que posição começa e quantos item ele vai remover a partir do começo do primeiro argumento.
        updatedCart.splice(productIndex, 1) 

        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }

    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context;
}
