package com.muster.attendance

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

class BluetoothPrinterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val REQUEST_ENABLE_BT = 1001
    private var enableBtPromise: Promise? = null
    private var isReceiverRegistered = false

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == REQUEST_ENABLE_BT) {
                val adapter = getAdapter()
                val isEnabled = adapter?.isEnabled == true
                enableBtPromise?.resolve(isEnabled)
                enableBtPromise = null
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String {
        return "BluetoothPrinter"
    }

    private fun getAdapter(): BluetoothAdapter? {
        @Suppress("DEPRECATION")
        return BluetoothAdapter.getDefaultAdapter()
    }

    private fun hasPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val connect = ActivityCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
            val scan = ActivityCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.BLUETOOTH_SCAN
            ) == PackageManager.PERMISSION_GRANTED
            return connect && scan
        }
        return true
    }

    private fun isPrinterDevice(device: BluetoothDevice): Boolean {
        try {
            val name = (device.name ?: "").lowercase()
            if (name.contains("printer") || name.contains("pos") || name.contains("rpp") ||
                name.contains("mpt") || name.contains("bt") || name.contains("print") ||
                name.contains("58") || name.contains("80") || name.contains("innerprinter")) {
                return true
            }
            val major = device.bluetoothClass?.majorDeviceClass
            if (major == BluetoothClass.Device.Major.IMAGING || device.bluetoothClass?.deviceClass == 1664) {
                return true
            }
        } catch (_: Exception) {
        }
        return false
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (_: Exception) {
        }
    }

    private val discoveryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            when (action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                    if (device != null) {
                        val map = Arguments.createMap()
                        map.putString("name", device.name ?: "Bluetooth Device")
                        map.putString("address", device.address)
                        map.putBoolean("bonded", device.bondState == BluetoothDevice.BOND_BONDED)
                        map.putBoolean("isPrinter", isPrinterDevice(device))
                        sendEvent("BluetoothDeviceFound", map)
                    }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                    sendEvent("BluetoothDiscoveryFinished", null)
                }
                BluetoothDevice.ACTION_BOND_STATE_CHANGED -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                    val bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.BOND_NONE)
                    if (device != null) {
                        val map = Arguments.createMap()
                        map.putString("address", device.address)
                        map.putString("name", device.name ?: "Bluetooth Device")
                        map.putInt("bondState", bondState)
                        map.putBoolean("isBonded", bondState == BluetoothDevice.BOND_BONDED)
                        sendEvent("BluetoothBondStateChanged", map)
                    }
                }
            }
        }
    }

    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        val adapter = getAdapter()
        promise.resolve(adapter?.isEnabled == true)
    }

    @ReactMethod
    fun enableBluetooth(promise: Promise) {
        val adapter = getAdapter()
        if (adapter == null) {
            promise.resolve(false)
            return
        }
        if (adapter.isEnabled) {
            promise.resolve(true)
            return
        }

        try {
            // First attempt direct enable
            @Suppress("DEPRECATION")
            val direct = adapter.enable()
            if (direct) {
                Thread.sleep(500)
                if (adapter.isEnabled) {
                    promise.resolve(true)
                    return
                }
            }
        } catch (_: Exception) {
        }

        // Show system dialog to turn on Bluetooth
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
            enableBtPromise = promise
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            activity.startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT)
        } else {
            promise.resolve(adapter.isEnabled)
        }
    }

    @ReactMethod
    fun getPairedPrinters(promise: Promise) {
        val adapter = getAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.resolve(Arguments.createArray())
            return
        }
        if (!hasPermission()) {
            promise.reject("NO_PERMISSION", "Bluetooth permission not granted")
            return
        }

        try {
            val devices = adapter.bondedDevices
            val array = Arguments.createArray()
            for (device in devices) {
                val map = Arguments.createMap()
                map.putString("name", device.name ?: "Unknown")
                map.putString("address", device.address)
                map.putBoolean("bonded", true)
                map.putBoolean("isPrinter", isPrinterDevice(device))
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("DEVICE_ERROR", e.message ?: "Could not get paired devices")
        }
    }

    @ReactMethod
    fun startDiscovery(promise: Promise) {
        val adapter = getAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Bluetooth is not enabled")
            return
        }
        if (!hasPermission()) {
            promise.reject("NO_PERMISSION", "Bluetooth permission not granted")
            return
        }

        try {
            if (!isReceiverRegistered) {
                val filter = IntentFilter().apply {
                    addAction(BluetoothDevice.ACTION_FOUND)
                    addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
                    addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
                }
                reactApplicationContext.registerReceiver(discoveryReceiver, filter)
                isReceiverRegistered = true
            }

            if (adapter.isDiscovering) {
                adapter.cancelDiscovery()
            }
            val started = adapter.startDiscovery()
            promise.resolve(started)
        } catch (e: Exception) {
            promise.reject("DISCOVERY_ERROR", e.message ?: "Could not start discovery")
        }
    }

    @ReactMethod
    fun stopDiscovery(promise: Promise) {
        val adapter = getAdapter()
        if (adapter != null && adapter.isDiscovering) {
            adapter.cancelDiscovery()
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun pairDevice(address: String, promise: Promise) {
        val adapter = getAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Bluetooth is not enabled")
            return
        }
        try {
            val device = adapter.getRemoteDevice(address)
            if (device.bondState == BluetoothDevice.BOND_BONDED) {
                promise.resolve(true)
                return
            }
            adapter.cancelDiscovery()
            val bonded = device.createBond()
            promise.resolve(bonded)
        } catch (e: Exception) {
            promise.reject("BOND_ERROR", e.message ?: "Failed to initiate pairing")
        }
    }

    @ReactMethod
    fun printRawText(text: String, deviceAddress: String?, promise: Promise) {
        val adapter = getAdapter()
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Turn on bluetooth and connect printer")
            return
        }
        if (!hasPermission()) {
            promise.reject("NO_PERMISSION", "Bluetooth permission not granted")
            return
        }

        val bondedDevices = adapter.bondedDevices
        var targetDevice: BluetoothDevice? = null

        if (!deviceAddress.isNullOrBlank()) {
            targetDevice = bondedDevices.firstOrNull { it.address.equals(deviceAddress, ignoreCase = true) }
            if (targetDevice == null) {
                try {
                    targetDevice = adapter.getRemoteDevice(deviceAddress)
                } catch (_: Exception) {}
            }
        }

        if (targetDevice == null) {
            targetDevice = bondedDevices.firstOrNull { isPrinterDevice(it) }
        }

        if (targetDevice == null && bondedDevices.isNotEmpty()) {
            targetDevice = bondedDevices.first()
        }

        if (targetDevice == null) {
            promise.reject("NO_PRINTER", "No paired Bluetooth printer found. Please pair printer.")
            return
        }

        val device = targetDevice

        Thread {
            var socket: BluetoothSocket? = null
            try {
                val sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
                adapter.cancelDiscovery()

                socket = try {
                    device.createRfcommSocketToServiceRecord(sppUuid)
                } catch (e: Exception) {
                    val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                    method.invoke(device, 1) as BluetoothSocket
                }

                socket.connect()

                val outputStream = socket.outputStream

                // ESC @: Initialize printer
                outputStream.write(byteArrayOf(0x1B, 0x40))

                // Convert text to bytes (UTF-8)
                val bytes = text.toByteArray(Charsets.UTF_8)
                outputStream.write(bytes)

                // Feed lines
                outputStream.write(byteArrayOf(0x1B, 0x64, 0x04))

                // Cut paper command (GS V 66 0)
                outputStream.write(byteArrayOf(0x1D, 0x56, 0x42, 0x00))

                outputStream.flush()
                Thread.sleep(500)

                val result = Arguments.createMap()
                result.putBoolean("success", true)
                result.putString("printerName", device.name ?: "Printer")
                result.putString("printerAddress", device.address)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("PRINT_ERROR", e.message ?: "Failed to connect or print to Bluetooth printer")
            } finally {
                try {
                    socket?.close()
                } catch (_: Exception) {
                }
            }
        }.start()
    }

    // Required for React Native event emitter
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
