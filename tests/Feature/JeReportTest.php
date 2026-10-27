<?php

namespace Tests\Feature;

use App\Models\JeItem;
use App\Models\JeReceipt;
use App\Models\JeReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
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
        $this->assertSame(9, $report->items_count);
        $this->assertEqualsWithDelta(81.90, (float) $report->total, 0.001);
        $this->assertSame('2026-06-01', $report->period_from->format('Y-m-d'));
        $this->assertSame('2026-06-02', $report->period_to->format('Y-m-d'));
        $this->assertSame($admin->id, $report->uploaded_by);

        $receipts = $report->receipts()->orderBy('receipt_date')->orderBy('receipt_time')->get();
        $this->assertCount(3, $receipts);

        // cash receipt: 30.00 tendered - 4.00 change = 26.00 net
        $this->assertSame('Numerar', $receipts[0]->pay_method);
        $this->assertEqualsWithDelta(26.00, (float) $receipts[0]->numerar, 0.001);
        $this->assertEqualsWithDelta(26.00, (float) $receipts[0]->total, 0.001);

        // scale-sold item printed with a fractional BUC count (weight) and a
        // zero price/value line still parses instead of failing integrity checks
        $weighed = $receipts[0]->items()->where('name', 'KURTOS COCOS')->first();
        $this->assertNotNull($weighed, 'weighed item with fractional qty was not parsed');
        $this->assertSame(21, $weighed->qty);
        $this->assertEqualsWithDelta(0.00, (float) $weighed->value, 0.001);

        // some AMEF firmware prints "BUC X" without the trailing period
        $noDot = $receipts[0]->items()->where('name', 'GARANTIE SGR')->first();
        $this->assertNotNull($noDot, 'item line without a period after BUC was not parsed');
        $this->assertSame(1, $noDot->qty);
        $this->assertEqualsWithDelta(0.50, (float) $noDot->value, 0.001);

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
        $this->assertEqualsWithDelta(38.00, (float) $receipts[2]->total, 0.001);

        // item line using a unit other than BUC (e.g. GR) still parses
        $gramItem = $receipts[2]->items()->where('name', 'SANDWICH CU SUNCA')->first();
        $this->assertNotNull($gramItem, 'item line with a non-BUC unit was not parsed');
        $this->assertEqualsWithDelta(17.00, (float) $gramItem->value, 0.001);

        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.show', $report))
            ->assertOk();
    }

    public function test_show_filters_products_summary_by_date_range(): void
    {
        $admin = $this->admin();
        $this->upload($admin, $this->fixture());
        $report = JeReport::first();

        // unfiltered: distinct products from all 3 receipts (01 and 02 June)
        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.show', $report))
            ->assertInertia(fn ($page) => $page
                ->has('products', 7)
                ->where('filters.produse_de', null)
                ->where('filters.produse_pana', null)
            );

        // filtered to 02 June only: PRODUS C and SANDWICH CU SUNCA from that day's receipt
        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.show', [$report, 'produse_de' => '2026-06-02']))
            ->assertInertia(fn ($page) => $page
                ->has('products', 2)
                ->where('products.0.name', 'PRODUS C')
                ->where('filters.produse_de', '2026-06-02')
            );

        // an invalid date is ignored rather than breaking the query
        $this->actingAs($admin)
            ->get(route('dashboard.je-reports.show', [$report, 'produse_de' => 'nu-e-o-data']))
            ->assertInertia(fn ($page) => $page
                ->has('products', 7)
                ->where('filters.produse_de', null)
            );
    }

    public function test_month_show_compares_with_previous_month_and_previous_year(): void
    {
        $admin = $this->admin();
        $this->upload($admin, $this->fixture());
        $report = JeReport::first();

        // same calendar month, one year earlier — no .je fixture for this,
        // so insert the receipt row directly
        DB::table('je_receipts')->insert([
            'je_report_id' => $report->id,
            'receipt_date' => '2025-06-15',
            'receipt_time' => '10:00:00',
            'z' => 1,
            'bf' => 1,
            'id_bf' => 'TESTLASTYEAR00000001',
            'total' => 20.00,
            'pay_method' => 'Numerar',
            'numerar' => 20.00,
        ]);

        $response = $this->actingAs($admin)
            ->get(route('dashboard.je-reports.month', [$report, 'month' => '2026-06']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('prev_year.month', '2025-06')
            ->where('prev_year.n', 1)
            ->where('prev_year.total', 20)
            ->where(
                'insights',
                fn ($insights) => collect($insights)
                    ->contains(fn ($line) => str_contains($line, 'anului trecut'))
            )
            // no June 2026 data one month back (May 2026), so no prev-month comparison
            ->where('prev', null)
        );
    }

    public function test_upload_rejects_tampered_totals(): void
    {
        $tampered = str_replace(
            'TOTAL LEI                            26.00',
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

        $response = $this->actingAs($admin)
            ->get(route('dashboard.je-reports.export', $report))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $path = tempnam(sys_get_temp_dir(), 'je').'.xlsx';
        file_put_contents($path, $response->streamedContent());
        $sheet = IOFactory::load($path)->getSheetByName('Produse pe luni');
        unlink($path);

        $this->assertNotNull($sheet);
        $rows = $sheet->toArray(null, true, false);
        $this->assertSame('Produs', $rows[0][0]);
        $this->assertSame(['Total buc.', 'Valoare totală (lei)'], array_slice($rows[0], -2));
        $byName = collect(array_slice($rows, 1))->keyBy(0)->all();
        [$qty, $value] = array_slice($byName['PRODUS A'], -2);
        $this->assertSame((int) JeItem::where('name', 'PRODUS A')->sum('qty'), (int) $qty);
        $this->assertEqualsWithDelta((float) JeItem::where('name', 'PRODUS A')->sum('value'), (float) $value, 0.001);
        $this->assertStringEndsWith(' buc.', $rows[0][1]);
        $this->assertStringEndsWith(' (lei)', $rows[0][2]);
        // monthly value columns (C, E, ...) add up to the product's total value
        $monthCells = array_slice($byName['PRODUS A'], 1, -2);
        $monthValues = array_filter($monthCells, fn ($k) => $k % 2 === 1, ARRAY_FILTER_USE_KEY);
        $this->assertEqualsWithDelta((float) $value, array_sum($monthValues), 0.001);
        [$allQty, $allValue] = array_slice($byName['TOTAL'], -2);
        $this->assertSame((int) JeItem::sum('qty'), (int) $allQty);
        $this->assertEqualsWithDelta((float) JeItem::sum('value'), (float) $allValue, 0.001);
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
        $this->assertSame(0, JeReceipt::count());
        $this->assertSame(0, JeItem::count());
    }
}
