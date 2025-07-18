<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { showAlert } from '$lib/stores';

  let formData = {
    court_reference: '',
    court_name: '',
    court_book: '',
    court_page: '',
    court_date: '',
    supplier_tax_id: '',
    supplier_name: '',
    supplier_address: '',
    supplier_bank_account: '',
    worker_number: '',
    full_name: '',
    cin: '',
    address: '',
    workplace: '',
    job: '',
    employment_status: 'مباشر',
    bank_account: '',
    item_description: '',
    total_in_words: '',
    total_amount: '',
    monthly_payment: '',
    loan_duration: '18 شهرا',
    first_deduction_date: ''
  };

  let loading = false;

  async function handleSubmit() {
    try {
      loading = true;
      
      // Prepare the data for the document
      const documentData = {
        ...formData,
        // Add any additional formatting or data processing here
      };

      console.log('Sending document generation request with data:', documentData);

      // Call the API to generate the document
      const response = await api.post('/api/v1/documents/salary-assignment', documentData, {
        responseType: 'arraybuffer'
      });

      // Check if the response is a blob (success) or JSON (error)
      const contentType = response.headers?.['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        const errorText = await new TextDecoder().decode(response.data);
        let errorMessage = 'فشل في إنشاء المستند';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        
        throw new Error(errorMessage);
      }

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'إحالة_على_الأجر_تجارية.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlert('تم إنشاء المستند بنجاح', 'success');
    } catch (error) {
      console.error('Document generation error:', error);
      showAlert(error.message || 'فشل في إنشاء المستند', 'error');
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6" dir="rtl">
  <h1 class="text-2xl font-bold mb-6 text-center">إحالة على الأجر تجارية</h1>
  <h2 class="text-xl mb-6 text-center">في إطار قانون البيع بالتقسيط</h2>
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Court Reference Section -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">مراجع الإحالة بسجلات المحكمة</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="court_name" class="block text-sm font-medium">محكمة الناحية</label>
          <input
            type="text"
            id="court_name"
            bind:value={formData.court_name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="court_book" class="block text-sm font-medium">الدفتر</label>
          <input
            type="text"
            id="court_book"
            bind:value={formData.court_book}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="court_page" class="block text-sm font-medium">الصفحة</label>
          <input
            type="text"
            id="court_page"
            bind:value={formData.court_page}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="court_date" class="block text-sm font-medium">التاريخ</label>
          <input
            type="date"
            id="court_date"
            bind:value={formData.court_date}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    <!-- Supplier Information -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">البيانات المتعلقة بالمزود</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="supplier_tax_id" class="block text-sm font-medium">المعرف الجبائي</label>
          <input
            type="text"
            id="supplier_tax_id"
            bind:value={formData.supplier_tax_id}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="supplier_name" class="block text-sm font-medium">هوية المزود</label>
          <input
            type="text"
            id="supplier_name"
            bind:value={formData.supplier_name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="supplier_address" class="block text-sm font-medium">العنوان</label>
          <input
            type="text"
            id="supplier_address"
            bind:value={formData.supplier_address}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="supplier_bank_account" class="block text-sm font-medium">رقم الحساب البنكي للمزود</label>
          <input
            type="text"
            id="supplier_bank_account"
            bind:value={formData.supplier_bank_account}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

      <!-- Worker Information -->
      <div class="space-y-4">
      <h2 class="text-lg font-semibold">البيانات المتعلقة بالعون العمومي</h2>
        
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="worker_number" class="block text-sm font-medium">المعرف الوحيد</label>
          <input
            type="text"
            id="worker_number"
            bind:value={formData.worker_number}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="full_name" class="block text-sm font-medium">الإسم واللقب</label>
          <input
            type="text"
            id="full_name"
            bind:value={formData.full_name}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="cin" class="block text-sm font-medium">رقم بطاقة التعريف الوطنية</label>
          <input
            type="text"
            id="cin"
            bind:value={formData.cin}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="address" class="block text-sm font-medium">العنوان الشخصي</label>
          <input
            type="text"
            id="address"
            bind:value={formData.address}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="workplace" class="block text-sm font-medium">الهيكل الإداري المنتمي اليه</label>
          <input
            type="text"
            id="workplace"
            bind:value={formData.workplace}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="job" class="block text-sm font-medium">الرتبة</label>
          <input
            type="text"
            id="job"
            bind:value={formData.job}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="bank_account" class="block text-sm font-medium">رقم الحساب البنكي أو البريدي</label>
          <input
            type="text"
            id="bank_account"
            bind:value={formData.bank_account}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        </div>
      </div>

      <!-- Purchase Information -->
      <div class="space-y-4">
      <h2 class="text-lg font-semibold">البيانات المتعلقة بالبضاعة المقتناة</h2>
        
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label for="item_description" class="block text-sm font-medium">ذكر طبيعة البضاعة المقتناة بكل دقة</label>
          <input
            type="text"
            id="item_description"
            bind:value={formData.item_description}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="total_in_words" class="block text-sm font-medium">المبلغ الجملي للبضاعة المقتناة بلسان القلم</label>
          <input
            type="text"
            id="total_in_words"
            bind:value={formData.total_in_words}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="total_amount" class="block text-sm font-medium">المبلغ الجملي للبضاعة المقتناة بالأرقام</label>
          <input
            type="number"
            id="total_amount"
            bind:value={formData.total_amount}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="monthly_payment" class="block text-sm font-medium">المبلغ الشهري المقتطع من الراتب بالأرقام</label>
          <input
            type="number"
            id="monthly_payment"
            bind:value={formData.monthly_payment}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="first_deduction_date" class="block text-sm font-medium">تاريخ بداية سريان أول اقتطاع من الأجر</label>
          <input
            type="date"
            id="first_deduction_date"
            bind:value={formData.first_deduction_date}
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        type="submit"
        disabled={loading}
        class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? 'جاري الإنشاء...' : 'إنشاء المستند'}
      </button>
    </div>
  </form>
</div>