import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/category.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class CategoryController {

    static async createCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, parent, description, image } = req.body;
            const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            let ancestors: any[] = [];
            let level = 0;

            if (parent) {
                const parentCategory = await Category.findById(parent);
                if (!parentCategory) {
                    throw new AppError('Parent category not found', 404);
                }
                ancestors = [...parentCategory.ancestors, { _id: parentCategory._id, name: parentCategory.name, slug: parentCategory.slug }];
                level = parentCategory.level + 1;
            }

            const category = await Category.create({
                name,
                slug,
                parent: parent || null,
                description,
                image,
                level,
                ancestors
            });

            return ApiResponse.success(res, 201, 'Category created successfully', { category });
        } catch (error) {
            next(error);
        }
    }

    static async getCategories(req: Request, res: Response, next: NextFunction) {
        try {
            // Fetch only top-level categories by default, or all if query param set
            const filter = req.query.all === 'true' ? {} : { parent: null };
            const categories = await Category.find(filter).populate('parent', 'name slug');
            return ApiResponse.success(res, 200, 'Categories fetched successfully', { categories });
        } catch (error) {
            next(error);
        }
    }

    static async updateCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (updates.name) {
                updates.slug = updates.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            }

            const category = await Category.findByIdAndUpdate(id, updates, { new: true });
            if (!category) throw new AppError('Category not found', 404);

            return ApiResponse.success(res, 200, 'Category updated successfully', { category });
        } catch (error) {
            next(error);
        }
    }

    static async deleteCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const category = await Category.findByIdAndDelete(id);
            if (!category) throw new AppError('Category not found', 404);

            return ApiResponse.success(res, 200, 'Category deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}
