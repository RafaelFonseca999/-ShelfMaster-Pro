// Supabase Configuration
const SUPABASE_URL = 'https://uwtmaudxmjelnqsjarra.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dG1hdWR4bWplbG5xc2phcnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjQ4MjUsImV4cCI6MjA4ODgwMDgyNX0.Z0ieDQz7TEWEzKTzW4qxVRlYieLeczPX3BBRCZu8Y9M';

// Initialize Supabase client - check if it already exists
if (typeof window._supabaseClient === 'undefined') {
    try {
        if (typeof window !== 'undefined' && window.supabase) {
            window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
        } else {
            console.error('Supabase library not loaded');
            window._supabaseClient = null;
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        window._supabaseClient = null;
    }
}

// Inventory API Service
class InventoryAPI {
    constructor() {
        this.currentUser = null;
        this.debug = true;
    }

    get supabase() {
        return window._supabaseClient;
    }

    log(method, data) {
        if (this.debug) {
            console.log(`API.${method}:`, data);
        }
    }

    isSupabaseReady() {
        if (!this.supabase) {
            console.error('Supabase client not initialized');
            return false;
        }
        return true;
    }

    // Authentication Methods
    async register(name, email, password) {
        try {
            this.log('register', { name, email });
            
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            // Create auth user
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (authData && authData.user) {
                // Create user profile
                const { error: profileError } = await this.supabase
                    .from('users')
                    .insert([{
                        id: authData.user.id,
                        name: name,
                        email: email,
                        role: 'Employee'
                    }]);

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    throw profileError;
                }
            }

            return { success: true, user: authData.user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            this.log('login', { email });
            
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data && data.user) {
                // Get user profile
                const { data: profile, error: profileError } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.error('Profile fetch error:', profileError);
                    // If profile doesn't exist, create it
                    if (profileError.code === 'PGRST116') {
                        const { data: newProfile, error: createError } = await this.supabase
                            .from('users')
                            .insert([{
                                id: data.user.id,
                                name: email.split('@')[0],
                                email: email,
                                role: 'Employee'
                            }])
                            .select()
                            .single();
                            
                        if (createError) throw createError;
                        this.currentUser = newProfile;
                        return { success: true, user: newProfile };
                    } else {
                        throw profileError;
                    }
                }

                this.currentUser = profile;
                return { success: true, user: profile };
            }
            
            return { success: false, error: 'No user data returned' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        try {
            if (!this.isSupabaseReady()) {
                console.log('Supabase not ready, skipping getCurrentUser');
                return null;
            }

            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                // Ignorar erro de sessão ausente (normal quando não logado)
                if (error.name === 'AuthSessionMissingError') {
                    console.log('No active session (normal if not logged in)');
                    return null;
                }
                throw error;
            }
            
            if (user) {
                const { data: profile, error: profileError } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Profile fetch error:', profileError);
                }

                if (profile) {
                    this.currentUser = profile;
                    return profile;
                }
            }
            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    // Items Methods
    async getItems() {
        try {
            if (!this.isSupabaseReady()) {
                return [];
            }

            const { data, error } = await this.supabase
                .from('items')
                .select(`
                    *,
                    categories:category_id (name),
                    locations:location_id (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return (data || []).map(item => ({
                ...item,
                category: item.categories?.name,
                location: item.locations?.name
            }));
        } catch (error) {
            console.error('Get items error:', error);
            return [];
        }
    }

    async addItem(itemData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('items')
                .insert([itemData])
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('INSERT', 'items', data[0]?.id);
            
            return data[0];
        } catch (error) {
            console.error('Add item error:', error);
            throw error;
        }
    }

    async updateItem(id, itemData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('items')
                .update({ ...itemData, updated_at: new Date() })
                .eq('id', id)
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('UPDATE', 'items', id);
            
            return data[0];
        } catch (error) {
            console.error('Update item error:', error);
            throw error;
        }
    }

    async deleteItem(id) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { error } = await this.supabase
                .from('items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            // Log the action
            await this.logAction('DELETE', 'items', id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete item error:', error);
            throw error;
        }
    }

    // Locations Methods
    async getLocations() {
        try {
            if (!this.isSupabaseReady()) {
                return [];
            }

            const { data, error } = await this.supabase
                .from('locations')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get locations error:', error);
            return [];
        }
    }

    async addLocation(locationData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('locations')
                .insert([locationData])
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('INSERT', 'locations', data[0]?.id);
            
            return data[0];
        } catch (error) {
            console.error('Add location error:', error);
            throw error;
        }
    }

    async updateLocation(id, locationData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('locations')
                .update(locationData)
                .eq('id', id)
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('UPDATE', 'locations', id);
            
            return data[0];
        } catch (error) {
            console.error('Update location error:', error);
            throw error;
        }
    }

    async deleteLocation(id) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { error } = await this.supabase
                .from('locations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            // Log the action
            await this.logAction('DELETE', 'locations', id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete location error:', error);
            throw error;
        }
    }

    // Categories Methods
    async getCategories() {
        try {
            if (!this.isSupabaseReady()) {
                return [];
            }

            const { data, error } = await this.supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get categories error:', error);
            return [];
        }
    }

    async addCategory(categoryData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('categories')
                .insert([categoryData])
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('INSERT', 'categories', data[0]?.id);
            
            return data[0];
        } catch (error) {
            console.error('Add category error:', error);
            throw error;
        }
    }

    async updateCategory(id, categoryData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('categories')
                .update(categoryData)
                .eq('id', id)
                .select();

            if (error) throw error;
            
            // Log the action
            await this.logAction('UPDATE', 'categories', id);
            
            return data[0];
        } catch (error) {
            console.error('Update category error:', error);
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { error } = await this.supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            // Log the action
            await this.logAction('DELETE', 'categories', id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete category error:', error);
            throw error;
        }
    }

    // Movements Methods
    async getMovements() {
        try {
            if (!this.isSupabaseReady()) {
                return [];
            }

            const { data, error } = await this.supabase
                .from('movements')
                .select(`
                    *,
                    items:item_id (name),
                    from_locations:from_location (name),
                    to_locations:to_location (name),
                    users:moved_by (name)
                `)
                .order('moved_at', { ascending: false });

            if (error) throw error;
            
            return (data || []).map(movement => ({
                id: movement.id,
                item: movement.items?.name || 'Unknown',
                from: movement.from_locations?.name || 'Unknown',
                to: movement.to_locations?.name || 'Unknown',
                quantity: movement.quantity || 0,
                date: movement.moved_at ? new Date(movement.moved_at).toLocaleDateString() : 'Unknown',
                moved_by: movement.users?.name || 'Unknown',
                notes: movement.notes || ''
            }));
        } catch (error) {
            console.error('Get movements error:', error);
            return [];
        }
    }

    async addMovement(movementData) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            const { data, error } = await this.supabase
                .from('movements')
                .insert([movementData])
                .select();

            if (error) throw error;
            
            // Atualizar a localização do item para o destino, se for um movimento
            if (movementData.to_location) {
                const { error: updateError } = await this.supabase
                    .from('items')
                    .update({ location_id: movementData.to_location, updated_at: new Date() })
                    .eq('id', movementData.item_id);

                if (updateError) throw updateError;
            }
            
            // Log the action
            await this.logAction('INSERT', 'movements', data[0]?.id);
            
            return data[0];
        } catch (error) {
            console.error('Add movement error:', error);
            throw error;
        }
    }

    // Helper Methods
    async updateItemQuantity(itemId, quantityChange) {
        try {
            if (!this.isSupabaseReady()) {
                throw new Error('Database connection not available');
            }

            // Get current item
            const { data: item, error: getError } = await this.supabase
                .from('items')
                .select('quantity')
                .eq('id', itemId)
                .single();

            if (getError) throw getError;
            if (!item) throw new Error('Item not found');

            // Update quantity
            const newQuantity = (item.quantity || 0) + quantityChange;
            if (newQuantity < 0) throw new Error('Insufficient quantity');

            const { error: updateError } = await this.supabase
                .from('items')
                .update({ quantity: newQuantity, updated_at: new Date() })
                .eq('id', itemId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Update item quantity error:', error);
            throw error;
        }
    }

    async logAction(action, tableName, recordId) {
        if (!this.currentUser || !this.isSupabaseReady()) return;

        try {
            await this.supabase
                .from('audit_logs')
                .insert([{
                    user_id: this.currentUser.id,
                    action: action,
                    table_name: tableName,
                    record_id: recordId,
                    timestamp: new Date()
                }]);
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    }

    async getDashboardStats() {
        try {
            const items = await this.getItems();
            const locations = await this.getLocations();
            const categories = await this.getCategories();
            const movements = await this.getMovements();

            const totalValue = items.reduce((sum, item) => sum + ((item.value || 0) * (item.quantity || 0)), 0);
            const lowStock = items.filter(item => (item.quantity || 0) < 5).length;

            return {
                totalItems: items.length,
                totalLocations: locations.length,
                totalCategories: categories.length,
                totalValue: totalValue || 0,
                lowStock: lowStock || 0,
                recentMovements: movements.slice(0, 5)
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {
                totalItems: 0,
                totalLocations: 0,
                totalCategories: 0,
                totalValue: 0,
                lowStock: 0,
                recentMovements: []
            };
        }
    }
}

// Create global API instance only once
if (typeof window.api === 'undefined') {
    window.api = new InventoryAPI();
    console.log('API initialized and available globally');
}