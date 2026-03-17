import React from 'react';
import SuperAdminShell from './superadmin/SuperAdminShell';

function AdminConsole() {
  return <SuperAdminShell onExit={() => window.location.href = '/'} />;
}

export default AdminConsole;