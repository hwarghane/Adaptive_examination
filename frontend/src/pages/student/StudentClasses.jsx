import { useEffect, useState, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import { Users, Plus, Building2, BookOpen, QrCode, X, Camera, Keyboard } from 'lucide-react';

// ── QR Scanner Modal ──────────────────────────────────────────────────────────
function QRScannerModal({ onResult, onClose }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      try {
        // Dynamic import so it only loads when needed
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        instanceRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            // decodedText is the full URL or the code itself
            // Extract code from URL: .../join/XXXXXXXX
            const match = decodedText.match(/\/join\/([A-Z0-9]{8})$/i);
            const code = match ? match[1].toUpperCase() : decodedText.trim().toUpperCase();
            if (/^[A-Z0-9]{8}$/.test(code)) {
              onResult(code);
              stopScanner();
            } else {
              toast.error('QR code is not a valid class invite');
            }
          },
          () => {} // ignore per-frame errors
        );
        setStarted(true);
      } catch (err) {
        if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else {
          setError('Could not start camera: ' + (err?.message || String(err)));
        }
      }
    };

    const stopScanner = async () => {
      if (instanceRef.current) {
        try { await instanceRef.current.stop(); } catch {}
        try { instanceRef.current.clear(); } catch {}
        instanceRef.current = null;
      }
    };

    startScanner();
    return () => { stopScanner(); };
  }, []);

  const stopAndClose = async () => {
    if (instanceRef.current) {
      try { await instanceRef.current.stop(); } catch {}
      try { instanceRef.current.clear(); } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Scan QR Code</h2>
          </div>
          <button onClick={stopAndClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <p className="text-red-600 text-sm font-medium mb-1">Camera Error</p>
              <p className="text-gray-500 text-xs">{error}</p>
              <button onClick={stopAndClose} className="btn-secondary mt-4 text-sm">Close</button>
            </div>
          ) : (
            <>
              {/* Scanner container — html5-qrcode renders into this div */}
              <div
                id="qr-reader"
                ref={scannerRef}
                className="rounded-xl overflow-hidden bg-gray-900"
                style={{ width: '100%', minHeight: 260 }}
              />
              <p className="text-center text-xs text-gray-400 mt-3">
                Point your camera at the QR code on the class invite
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentClasses() {
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining,  setJoining]  = useState(false);
  const [joinMode, setJoinMode] = useState('code'); // 'code' | 'qr'
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    api.get('/classes/enrolled/me')
      .then(r => setClasses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doJoin = async (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setJoining(true);
    try {
      const { data } = await api.post('/classes/join', { joinCode: trimmed });
      toast.success(data.message);
      // Add the class to the list without re-fetching
      setClasses(c => [data.class, ...c]);
      setJoinCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    doJoin(joinCode);
  };

  const handleQRResult = (code) => {
    setShowScanner(false);
    toast.success(`Code scanned: ${code}`);
    doJoin(code);
  };

  if (loading) return <PageLoader text="Loading classes..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enrolled in {classes.length} class{classes.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* ── Join a class card ─────────────────────────────────────────────── */}
      <div className="card bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-emerald-900 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Join a Class
          </h2>
          {/* Toggle between code and QR */}
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-emerald-200">
            <button
              onClick={() => setJoinMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                joinMode === 'code'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" /> Type Code
            </button>
            <button
              onClick={() => setJoinMode('qr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                joinMode === 'qr'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> Scan QR
            </button>
          </div>
        </div>

        {joinMode === 'code' ? (
          <>
            <form onSubmit={handleCodeSubmit} className="flex gap-2">
              <input
                className="input-field flex-1 uppercase tracking-widest font-mono text-center text-lg"
                placeholder="A B C D E F G H"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />
              <button
                type="submit"
                disabled={joining || joinCode.length !== 8}
                className="btn-success whitespace-nowrap px-5 disabled:opacity-50"
              >
                {joining ? 'Joining…' : 'Join'}
              </button>
            </form>
            <p className="text-xs text-emerald-600 mt-2">
              Ask your teacher for the 8-character class code.
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Open your device camera to scan the QR code from your teacher's class page.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="btn-success flex items-center gap-2 mx-auto"
            >
              <Camera className="w-4 h-4" /> Open Camera & Scan
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Make sure to allow camera access when prompted.
            </p>
          </div>
        )}
      </div>

      {/* ── Enrolled classes ──────────────────────────────────────────────── */}
      {classes.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Not in any classes yet</h3>
          <p className="text-gray-400 text-sm">
            Enter your teacher's 8-character code or scan their QR code above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls._id} className="card hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                {cls.subject && <p className="text-sm text-gray-400">{cls.subject}</p>}
              </div>
              {cls.description && (
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{cls.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Taught by <strong>{cls.teacher?.name}</strong></span>
                </div>
                {cls.teacher?.email && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs truncate">{cls.teacher.email}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Joined {cls.joinedAt ? new Date(cls.joinedAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QR Scanner Modal ──────────────────────────────────────────────── */}
      {showScanner && (
        <QRScannerModal
          onResult={handleQRResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
