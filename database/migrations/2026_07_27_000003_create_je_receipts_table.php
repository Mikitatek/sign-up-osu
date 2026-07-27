<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('je_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('je_report_id')->constrained('je_reports')->cascadeOnDelete();
            $table->date('receipt_date');
            $table->time('receipt_time');
            $table->unsignedInteger('z');
            $table->unsignedInteger('bf');
            $table->string('id_bf', 40);
            $table->decimal('total', 10, 2);
            $table->string('pay_method', 64);
            $table->decimal('numerar', 10, 2)->default(0);
            $table->decimal('card', 10, 2)->default(0);
            $table->decimal('online', 10, 2)->default(0);
            $table->decimal('tichete_masa', 10, 2)->default(0);
            $table->decimal('tichete_valorice', 10, 2)->default(0);
            $table->decimal('voucher', 10, 2)->default(0);
            $table->decimal('plata_moderna', 10, 2)->default(0);
            $table->decimal('credit', 10, 2)->default(0);
            $table->decimal('numerar_eur_lei', 10, 2)->default(0);
            $table->decimal('numerar_eur_orig', 10, 2)->nullable();
            $table->string('cif_client')->nullable();
            $table->unsignedSmallInteger('anulare_lines')->default(0);

            $table->index(['je_report_id', 'receipt_date']);
            $table->index(['je_report_id', 'pay_method']);
            $table->unique(['je_report_id', 'id_bf']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('je_receipts');
    }
};
