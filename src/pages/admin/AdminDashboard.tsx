import { Navigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

export default function AdminDashboard() {
  return <Navigate to="/admin/produtos" replace />;
}
