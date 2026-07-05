package com.todoapp.dto;

public class GuestBootstrapResponse {

    private BoardResponse board;
    private RecycleBinResponse recycleBin;

    public GuestBootstrapResponse(BoardResponse board, RecycleBinResponse recycleBin) {
        this.board = board;
        this.recycleBin = recycleBin;
    }

    public BoardResponse getBoard() {
        return board;
    }

    public RecycleBinResponse getRecycleBin() {
        return recycleBin;
    }
}
