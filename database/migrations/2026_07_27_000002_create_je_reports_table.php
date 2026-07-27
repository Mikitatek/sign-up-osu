<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('je_reports', function (Blueprint $table) {
            $table->id();
            $table->string('original_filename');
            $table->string('device_serial')->nullable();
            $table->string('fiscal_serial')->nullable();
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->unsignedInteger('receipts_count')->default(0);
            $table->unsignedInteger('items_count')->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('je_reports');
    }
};
