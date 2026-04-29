// Ensure firebase-admin is initialized before any function module runs.
import './admin';

export { onUserCreate } from './auth/onUserCreate';
export { setPendingRole } from './auth/setPendingRole';
