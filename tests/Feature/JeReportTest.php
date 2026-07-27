<?php

namespace Tests\Feature;

use App\Models\JeReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class JeReportTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    private function client(): User
    {
        return User::factory()->create(['is_admin' => false]);
    }

    private function fixture(): string
    {
        return file_get_contents(base_path('tests/Fixtures/sample.je'));
    }

    private function upload(User $user, string $contents, string $name = 'jurnal.je')
    {
        return $this->actingAs($user)->post(
            route('dashboard.je-reports.store'),
            ['je_file' => UploadedFile::fake()->createWithContent($name, $contents)],
        );
    }

    public function test_guests_are_redirected_from_dashboard(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/dashboard/je-reports')->assertRedirect('/login');
    }

    public function test_non_admin_users_cannot_access_dashboard(): void
    {
        $client = $this->client();

        $this->actingAs($client)->get('/dashboard')->assertForbidden();
        $this->actingAs($client)->get('/dashboard/je-reports')->assertForbidden();
        $this->actingAs($client)->get('/dashboard/newsletter')->assertForbidden();
        $this->actingAs($client)->get('/dashboard/products')->assertForbidden();
        $this->actingAs($client)->get('/dashboard/terms-editor')->assertForbidden();
    }

    public function test_non_admin_users_cannot_upload_or_view_reports(): void
    {
        $this->upload($this->client(), $this->fixture())->assertForbidden();
        $this->assertSame(0, JeReport::count());
    }

    public function test_admin_can_access_je_reports_index(): void
    {
        $this->actingAs($this->admin())
            ->get(route('dashboard.je-reports.index'))
            ->assertOk();
    }

    public function test_upload_parses_receipts_items_and_payments(): void
    {
        $admin = $this->admin();

        $response = $this->upload($admin, $this->fixture());

        $report = JeReport::first();
        $this->assertNotNull($report);
        $response->assertRedirect(route('dashboard.je-reports.show', $report));

        $this->assertSame('4000000000', $report->fiscal_serial);
        $this->assertSame('TB0000000001', $report->device_serial);
        $this->assertSame(3, $report->receipts_count);
        $this->assertSame(6, $report->items_count);
        $this->assertEqualsWithDelta(64.40, (float) $report->total, 0.001);
        $this->assertSame('2026-06-01', $report->period_from->format('Y-m-d'));
        $this->assertSame('2026-06-02', $report->period_to->format('Y-m-d'));
        $this->assertSame($admin->id, $report->uploaded_by);

        $receipts = $report->receipts()->orderBy('receipt_date')->orderBy('receipt_time')->get();
        $this->assertCount(3, $receipts);

        // cash receipt: 30.00 tendered - 4.50 change = 25.50 net
        $this->assertSame('Numerar', $receipts[0]->pay_method);
        $this->assertEqualsWithDelta(25.50, (float) $receipts[0]->numerar, 0.001);
        $this->assertEqualsWithDelta(25.50, (float) $receipts[0]->total, 0.001);

        // card receipt with a voided line and a wrapped product name
        $this->assertSame('Card', $receipts[1]->pay_method);
        $this->assertEqualsWithDelta(17.90, (float) $receipts[1]->card, 0.001);
        $this->assertSame(1, $receipts[1]->anulare_lines);
        $this->assertTrue(
            $receipts[1]->items()->where('name', 'PRODUS CU NUME FOARTE LUNG')->exists(),
            'wrapped product name was not joined'
        );
        $this->assertSame(
            -1,
            (int) $receipts[1]->items()->where('qty', '<', 0)->value('qty'),
            'voided line missing'
        );

        // online receipt with client CIF
        $this->assertSame('Online', $receipts[2]->pay_method);
        $this->assertSame('RO12345678', $receipts[2]->cif_client);

        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.show', $report))
            ->assertOk();
    }

    public function test_upload_rejects_tampered_totals(): void
    {
        $tampered = str_replace(
            'TOTAL LEI                            25.50',
            'TOTAL LEI                            99.99',
            $this->fixture()
        );

        $this->upload($this->admin(), $tampered)->assertSessionHasErrors('je_file');
        $this->assertSame(0, JeReport::count());
    }

    public function test_upload_rejects_files_that_are_not_journals(): void
    {
        $this->upload($this->admin(), 'nu e un jurnal')->assertSessionHasErrors('je_file');
        $this->upload($this->admin(), $this->fixture(), 'jurnal.txt')->assertSessionHasErrors('je_file');
        $this->assertSame(0, JeReport::count());
    }

    public function test_export_downloads_spreadsheet(): void
    {
        $admin = $this->admin();
        $this->upload($admin, $this->fixture());
        $report = JeReport::first();

        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.export', $report))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_destroy_removes_report_and_children(): void
    {
        $admin = $this->admin();
        $this->upload($admin, $this->fixture());
        $report = JeReport::first();

        $this->actingAs($admin)
            ->delete(route('dashboard.je-reports.destroy', $report))
            ->assertRedirect(route('dashboard.je-reports.index'));

        $this->assertSame(0, JeReport::count());
        $this->assertSame(0, \App\Models\JeReceipt::count());
        $this->assertSame(0, \App\Models\JeItem::count());
    }
}
