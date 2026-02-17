import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { ProductController } from '../controllers/product.controller';
import { protect, optionalProtect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Categories
router.get('/categories', CategoryController.getCategories);
router.post('/categories', protect, restrictTo('admin'), CategoryController.createCategory);

// Products
router.get('/suggestions', ProductController.getSuggestions);
router.get('/recently-viewed', optionalProtect, ProductController.getRecentlyViewed);
router.post('/track-view', optionalProtect, ProductController.trackView);
router.get('/aggregations', ProductController.getSearchAggregations);
router.get('/my-products', protect, restrictTo('seller', 'admin'), ProductController.getMyProducts);
router.get('/', ProductController.getProducts); // Public listing
router.get('/:slug', ProductController.getProductBySlug);
router.get('/:id/related', ProductController.getRelatedProducts);
router.post('/', protect, restrictTo('seller', 'admin'), ProductController.createProduct);
router.post('/bulk-import', protect, restrictTo('seller', 'admin'), ProductController.bulkImportProducts);
router.patch('/:id', protect, restrictTo('seller', 'admin'), ProductController.updateProduct);
router.patch('/:id/status', protect, restrictTo('admin'), ProductController.updateProductStatus);

export default router;
