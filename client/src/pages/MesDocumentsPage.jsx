import BottomNav from '../components/BottomNav';
import MesDocumentsEmploye from '../components/MesDocumentsEmploye';
import { useNavigate } from 'react-router-dom';

export default function MesDocumentsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pt-16">
      <div className="max-w-lg mx-auto px-4 pt-20 lg:pt-8">
        <MesDocumentsEmploye onBack={() => navigate(-1)} />
      </div>
      <BottomNav />
    </div>
  );
}
