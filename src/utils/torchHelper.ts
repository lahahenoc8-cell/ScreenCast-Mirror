// Hardware Torch / Flashlight Controller for Mobile Browsers

class TorchController {
  private activeTorchStream: MediaStream | null = null;
  private activeTorchTrack: MediaStreamTrack | null = null;
  private isTorchActive: boolean = false;

  public isTorchOn(): boolean {
    return this.isTorchActive;
  }

  public async toggle(existingTrack?: MediaStreamTrack | null): Promise<boolean> {
    const nextState = !this.isTorchActive;
    await this.setTorch(nextState, existingTrack);
    return this.isTorchActive;
  }

  /**
   * Toggles the physical hardware camera flash/torch on mobile devices.
   * If an active external camera track is provided (e.g. during live camera streaming),
   * it applies constraints directly to it.
   */
  public async setTorch(enable: boolean, existingTrack?: MediaStreamTrack | null): Promise<{ success: boolean; message: string }> {
    try {
      if (enable) {
        let hardwareTorchApplied = false;

        // 1. If an existing camera track is passed (back camera) and active
        if (existingTrack && existingTrack.readyState === 'live') {
          try {
            const capabilities = (existingTrack as any).getCapabilities?.() || {};
            if ('torch' in capabilities || 'fillLightMode' in capabilities) {
              await (existingTrack as any).applyConstraints({
                advanced: [{ torch: true }],
              });
              hardwareTorchApplied = true;
              this.activeTorchTrack = existingTrack;
            }
          } catch (trackErr) {
            console.warn('Could not apply torch to existingTrack:', trackErr);
          }
        }

        // 2. If no existing track or not supported on existing, request back camera safely
        if (!hardwareTorchApplied) {
          try {
            if (!this.activeTorchTrack || this.activeTorchTrack.readyState === 'ended') {
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Request back camera with standard constraints (never pass advanced to getUserMedia directly)
                const stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    facingMode: { ideal: 'environment' },
                  },
                  audio: false,
                });

                this.activeTorchStream = stream;
                this.activeTorchTrack = stream.getVideoTracks()[0];
              }
            }

            if (this.activeTorchTrack && this.activeTorchTrack.readyState === 'live') {
              const track = this.activeTorchTrack;
              const capabilities = (track as any).getCapabilities?.() || {};

              if ('torch' in capabilities || 'fillLightMode' in capabilities) {
                await (track as any).applyConstraints({
                  advanced: [{ torch: true }],
                });
                hardwareTorchApplied = true;
              } else {
                // Fallback attempt
                try {
                  await (track as any).applyConstraints({
                    advanced: [{ torch: true }],
                  });
                  hardwareTorchApplied = true;
                } catch (e2) {
                  // Not supported on this physical sensor
                }
              }
            }
          } catch (camErr: any) {
            console.warn('Physical camera torch request failed:', camErr);
          }
        }

        this.isTorchActive = true;
        return { 
          success: true, 
          message: hardwareTorchApplied 
            ? '🔦 Torche physique LED allumée !' 
            : '💡 Torche écran activée (Flash LED physique non disponible sur ce navigateur/appareil)' 
        };
      } else {
        // Turn OFF torch
        this.isTorchActive = false;

        if (existingTrack && existingTrack.readyState === 'live') {
          try {
            await (existingTrack as any).applyConstraints({
              advanced: [{ torch: false }],
            });
          } catch (e) {}
        }

        if (this.activeTorchTrack) {
          try {
            await (this.activeTorchTrack as any).applyConstraints({
              advanced: [{ torch: false }],
            });
          } catch (e) {}
          if (this.activeTorchTrack !== existingTrack) {
            this.activeTorchTrack.stop();
          }
          this.activeTorchTrack = null;
        }

        if (this.activeTorchStream) {
          this.activeTorchStream.getTracks().forEach((t) => t.stop());
          this.activeTorchStream = null;
        }

        return { success: true, message: '🔦 Torche éteinte' };
      }
    } catch (err: any) {
      console.warn('Physical torch toggle error:', err);
      // Clean up on error
      if (this.activeTorchTrack && this.activeTorchTrack !== existingTrack) {
        this.activeTorchTrack.stop();
        this.activeTorchTrack = null;
      }
      if (this.activeTorchStream) {
        this.activeTorchStream.getTracks().forEach((t) => t.stop());
        this.activeTorchStream = null;
      }
      this.isTorchActive = enable;
      return {
        success: false,
        message: err.message || 'Torche contrôlée',
      };
    }
  }
}

export const torchController = new TorchController();
