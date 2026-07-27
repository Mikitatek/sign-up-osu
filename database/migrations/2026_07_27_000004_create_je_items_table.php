<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('je_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('je_report_id')->constrained('je_reports')->cascadeOnDelete();
            $table->foreignId('je_receipt_id')->constrained('je_receipts')->cascadeOnDelete();
            $table->string('name');
            $table->integer('qty')->nullable();
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->decimal('value', 10, 2);

            $table->index(['je_report_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('je_items');
    }
};
