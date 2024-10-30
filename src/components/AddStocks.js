import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Edit, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddStocks = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    stockId: '',
    productId: '',
    quantity: ''
  });
  const [error, setError] = useState('');
  const [productError, setProductError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(null);
  const [stockIdExists, setStockIdExists] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ stockId: '', productId: '', quantity: '' });
      setError('');
      setProductError('');
      setCurrentStock(null);
      setStockIdExists(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const checkExistingStock = async () => {
      if (!formData.stockId && !formData.productId) return;

      try {
        // First check if the product exists
        if (formData.productId) {
          try {
            const productResponse = await axios.get(`/api/products?id=${formData.productId}`);
            if (!productResponse.data.product) {
              setProductError('Product ID does not exist');
              setCurrentStock(null);
              return;
            }
          } catch (err) {
            setProductError('Product ID does not exist');
            setCurrentStock(null);
            return;
          }
        }

        // Then check stock information
        const response = await axios.get('/api/stocks', {
          params: {
            page: 1,
            limit: 100 // Increase limit to ensure we get all stocks
          }
        });

        const existingStock = formData.stockId ? 
          response.data.stocks.find(s => s.id === parseInt(formData.stockId)) : null;
        const productStock = formData.productId ?
          response.data.stocks.find(s => s.product_id === parseInt(formData.productId)) : null;

        if (existingStock) {
          setStockIdExists(true);
          if (formData.productId && existingStock.product_id !== parseInt(formData.productId)) {
            setProductError(`Stock ID ${formData.stockId} is already assigned to Product ID ${existingStock.product_id}`);
            setCurrentStock(null);
            return;
          }
        } else {
          setStockIdExists(false);
        }

        if (productStock && (!existingStock || existingStock.id !== productStock.id)) {
          setProductError(`Product ID ${formData.productId} already has Stock ID ${productStock.id}`);
          setCurrentStock(null);
          return;
        }

        if (existingStock && existingStock.product_id === parseInt(formData.productId)) {
          setCurrentStock(existingStock);
          setError(`Current stock quantity: ${existingStock.quantity}. New quantity will be added to this.`);
          setProductError('');
        } else {
          setCurrentStock(null);
          setError('');
          setProductError('');
        }
      } catch (err) {
        console.error('Error checking existing stock:', err);
        setError('Error checking stock information');
      }
    };

    const timeoutId = setTimeout(checkExistingStock, 500); // Debounce the API calls
    return () => clearTimeout(timeoutId);
  }, [formData.stockId, formData.productId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Only allow positive numbers
    if ((name === 'stockId' || name === 'productId' || name === 'quantity') && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0) return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    setLoading(true);
    try {
      const stockData = {
        id: parseInt(formData.stockId),
        product_id: parseInt(formData.productId),
        quantity: parseInt(formData.quantity)
      };
  
      const response = await axios.post('/api/stocks', stockData);
  
      if (response.data) {
        // Show success message with quantity details if it was an update
        if (response.data.previousQuantity !== undefined) {
          setError(`Successfully updated stock. Previous: ${response.data.previousQuantity}, Added: ${response.data.addedQuantity}, New Total: ${response.data.newQuantity}`);
        } else {
          setError('Stock added successfully');
        }
  
        // Trigger refresh of stock list
        onSubmit(response.data);
        
        // Optional: Clear form after short delay to show success message
        onClose();
  setFormData({ stockId: '', productId: '', quantity: '' });
  setCurrentStock(null);
  setError('');
}
    } catch (err) {
      console.error('Error handling stock:', err);
      setError(err.response?.data?.error || 'Error processing your request');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.stockId || !formData.productId || !formData.quantity) {
      setError('All fields are required');
      return false;
    }
    if (productError) {
      return false;
    }
    return true;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl text-orange-500 font-bold mb-6 flex items-center">
              <Plus className="w-6 h-6 mr-2" />
              Add Stock
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Stock ID
                </label>
                <input
                  type="number"
                  name="stockId"
                  value={formData.stockId}
                  onChange={handleInputChange}
                  className="bg-neutral-700 text-gray-100 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                  placeholder="Enter Stock ID (e.g., 101)"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Product ID
                </label>
                <input
                  type="number"
                  name="productId"
                  value={formData.productId}
                  onChange={handleInputChange}
                  className="bg-neutral-700 text-gray-100 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                  placeholder="Enter Product ID (e.g., 1)"
                />
                {productError && (
                  <div className="text-red-500 text-sm mt-1">
                    {productError}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="bg-neutral-700 text-gray-100 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                  placeholder="Enter quantity to add"
                />
              </div>

              {currentStock && (
                <div className="bg-neutral-700 p-3 rounded-md">
                  <p className="text-sm text-gray-300">
                    Current stock: {currentStock.quantity} units
                    {formData.quantity && (
                      <>
                        <br />
                        After adding: {currentStock.quantity + parseInt(formData.quantity || 0)} units
                      </>
                    )}
                  </p>
                </div>
              )}

              {error && !currentStock && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto text-gray-300 bg-neutral-700 hover:bg-neutral-600 focus:ring-4 focus:outline-none focus:ring-neutral-500 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center justify-center"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || productError !== ''}
                  className="w-full sm:w-auto text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center justify-center disabled:bg-orange-300"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {loading ? 'Processing...' : currentStock ? 'Add to Stock' : 'Create Stock'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddStocks;