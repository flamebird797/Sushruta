package com.sushruta.backend.models;

public class BodyRegionData {
    private int pain = 0;
    private int scar = 0;
    private int bruise = 0;
    private int burn = 0;
    private int discoloration = 0;
    private String note;

    public BodyRegionData() {}

    public BodyRegionData(int pain, int scar, int bruise, int burn, int discoloration, String note) {
        this.pain = pain;
        this.scar = scar;
        this.bruise = bruise;
        this.burn = burn;
        this.discoloration = discoloration;
        this.note = note;
    }

    public int getPain() { return pain; }
    public void setPain(int pain) {
        validateLevel(pain);
        this.pain = pain;
    }

    public int getScar() { return scar; }
    public void setScar(int scar) {
        validateLevel(scar);
        this.scar = scar;
    }

    public int getBruise() { return bruise; }
    public void setBruise(int bruise) {
        validateLevel(bruise);
        this.bruise = bruise;
    }

    public int getBurn() { return burn; }
    public void setBurn(int burn) {
        validateLevel(burn);
        this.burn = burn;
    }

    public int getDiscoloration() { return discoloration; }
    public void setDiscoloration(int discoloration) {
        validateLevel(discoloration);
        this.discoloration = discoloration;
    }

    public String getNote() { return note; }
    public void setNote(String note) {
        this.note = note;
    }

    private void validateLevel(int level) {
        if (level < 0 || level > 10) {
            throw new IllegalArgumentException("Annotation level must be between 0 and 10");
        }
    }
}