import { Navigate } from 'react-router-dom';

export function AIAssistantPage() {
  return <Navigate to="/review" replace />;
}

// ponytail: keep the legacy route as a redirect so old links still work.
// add a dedicated page only if the product asks for a broader assistant again.
