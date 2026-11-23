import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#0e121a] text-slate-200">
          <div className="max-w-md w-full bg-[#161b24] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-rose-300 font-bold mt-1">
                Aplikasi mengalami kesalahan render. Perubahan data di server tetap tersimpan dengan aman.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-[#12161f] border border-slate-800 rounded-xl text-left">
                <span className="text-[10px] text-slate-500 font-mono block mb-1">DETAIL ERROR:</span>
                <p className="text-xs font-mono text-rose-400 break-words">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
