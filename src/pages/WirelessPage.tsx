import React, { useState } from 'react';
import { Wifi, Smartphone, Link, QrCode, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useTranslation } from '@/lib/i18n';
import { isPairingCode, normalizeAdbAddress } from '@/lib/adbAddress';
import { readStoredArray, writeStoredJson } from '@/lib/storage';

interface WirelessHistoryItem {
  address: string;
  name?: string;
  lastConnected: number;
}

export const WirelessPage: React.FC = () => {
  const { t } = useTranslation();
  const { fetchDevices, selectedDevice } = useDeviceStore();

  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('5555');

  const [pairIp, setPairIp] = useState('');
  const [pairCode, setPairCode] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [isSwitchingTcpIp, setIsSwitchingTcpIp] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [history, setHistory] = useState<WirelessHistoryItem[]>(() => {
    return readStoredArray<WirelessHistoryItem>('scrcpy-wireless-history').filter(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.address === 'string' &&
        typeof item.lastConnected === 'number'
    );
  });

  const addHistoryItem = (address: string) => {
    setHistory((current) => {
      const filtered = current.filter((item) => item.address !== address);
      const updated = [{ address, lastConnected: Date.now() }, ...filtered.slice(0, 9)];
      writeStoredJson('scrcpy-wireless-history', updated);
      return updated;
    });
  };

  const removeHistoryItem = (address: string) => {
    setHistory((current) => {
      const updated = current.filter((item) => item.address !== address);
      writeStoredJson('scrcpy-wireless-history', updated);
      return updated;
    });
  };

  // Method 1: USB to TCP/IP switch
  const handleEnableTcpIp = async () => {
    if (!selectedDevice || selectedDevice.connectionType === 'tcpip') return;
    setIsSwitchingTcpIp(true);
    setStatusMessage(null);
    try {
      await invoke('adb_tcpip_enable', {
        serial: selectedDevice.serial,
        port: 5555,
      });
      setStatusMessage({
        text: 'TCP/IP mode (port 5555) enabled! Unplug USB and connect via IP.',
        isError: false,
      });
      await fetchDevices();
    } catch (e) {
      setStatusMessage({
        text: `Failed to enable TCP/IP mode: ${String(e)}`,
        isError: true,
      });
    } finally {
      setIsSwitchingTcpIp(false);
    }
  };

  // Method 2: Manual Connect
  const handleConnect = async (addressOverride?: string) => {
    const addr = addressOverride
      ? normalizeAdbAddress(addressOverride)
      : normalizeAdbAddress(manualIp, manualPort || '5555');
    if (!addr) {
      setStatusMessage({ text: 'Enter a valid IPv4 address and port (1–65535).', isError: true });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);
    try {
      const res = await invoke<string>('adb_connect', { address: addr });
      setStatusMessage({ text: `Connected: ${res}`, isError: false });
      addHistoryItem(addr);
      await fetchDevices();
    } catch (e) {
      setStatusMessage({ text: `Connection failed: ${String(e)}`, isError: true });
    } finally {
      setIsConnecting(false);
    }
  };

  // Method 3: Wireless Pairing
  const handlePair = async () => {
    const pairingAddress = normalizeAdbAddress(pairIp);
    if (!pairingAddress || !isPairingCode(pairCode)) {
      setStatusMessage({ text: 'Enter the pairing IP:port and a valid 6-digit code.', isError: true });
      return;
    }

    setIsPairing(true);
    setStatusMessage(null);
    try {
      const res = await invoke<string>('adb_pair', {
        address: pairingAddress,
        code: pairCode.trim(),
      });
      setStatusMessage({
        text: `Paired successfully: ${res}. Now enter the separate connection port shown on the device.`,
        isError: false,
      });
      setPairCode('');
    } catch (e) {
      setStatusMessage({ text: `Pairing failed: ${String(e)}`, isError: true });
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {t('wirelessTitle')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t('wirelessSubtext')}
        </p>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs leading-relaxed ${
            statusMessage.isError
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid of Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method 1: USB to Wireless Switch */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">
              {t('tcpipMethod')}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('tcpipDesc')}
            </p>
          </div>

          <button
            onClick={handleEnableTcpIp}
            disabled={
              isSwitchingTcpIp || !selectedDevice || selectedDevice.connectionType === 'tcpip'
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
          >
            <Wifi className="w-4 h-4" />
            <span>{isSwitchingTcpIp ? 'Switching...' : t('enableWirelessBtn')}</span>
          </button>
        </div>

        {/* Method 2: Direct IP & Port Connect */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="w-10 h-10 rounded-xl bg-surface-hover text-text-primary border border-border flex items-center justify-center">
            <Link className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              {t('manualConnect')}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Connect to a known Android device IP on port 5555.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('ipAddress')}
              </label>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('port')}
              </label>
              <input
                type="text"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
                placeholder="5555"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={() => handleConnect()}
            disabled={isConnecting || !manualIp.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
          >
            <Link className="w-4 h-4" />
            <span>{isConnecting ? 'Connecting...' : t('connect')}</span>
          </button>
        </div>

        {/* Method 3: Android 11+ Wireless Debugging Pairing */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="w-10 h-10 rounded-xl bg-surface-hover text-text-primary border border-border flex items-center justify-center">
            <QrCode className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              {t('pairingSection')}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('pairingDesc')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('pairingIp')}
              </label>
              <input
                type="text"
                value={pairIp}
                onChange={(e) => setPairIp(e.target.value)}
                placeholder="192.168.1.100:37123"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('pairingCode')}
              </label>
              <input
                type="text"
                maxLength={6}
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono tracking-widest text-center focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={handlePair}
            disabled={isPairing || !pairIp.trim() || !pairCode.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
          >
            <QrCode className="w-4 h-4" />
            <span>{isPairing ? 'Pairing...' : t('pairAndConnect')}</span>
          </button>
        </div>

        {/* Connection History */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t('connectionHistory')}
          </h3>

          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted rounded-xl bg-surface border border-border">
              No recent wireless connections.
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.address}
                  className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-text-primary block font-mono">
                      {item.address}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(item.lastConnected).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConnect(item.address)}
                      className="px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                    >
                      {t('reconnect')}
                    </button>
                    <button
                      onClick={() => removeHistoryItem(item.address)}
                      className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
