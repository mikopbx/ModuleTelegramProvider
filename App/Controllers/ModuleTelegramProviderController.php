<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 11 2018
 */
namespace Modules\ModuleTelegramProvider\App\Controllers;
use MikoPBX\AdminCabinet\Controllers\BaseController;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Modules\PbxExtensionUtils;
use Modules\ModuleTelegramProvider\App\Forms\ModuleTelegramProviderForm;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use MikoPBX\Common\Models\Providers;
use Modules\ModuleTelegramProvider\Models\PhoneBook;
use Phalcon\Mvc\Model\Resultset;

class ModuleTelegramProviderController extends BaseController
{
    private $moduleUniqueID = 'ModuleTelegramProvider';
    private $moduleDir;

    /**
     * Basic initial class
     */
    public function initialize(): void
    {
        $this->moduleDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueID);
        $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";
        $this->view->submitMode = null;
        parent::initialize();
    }

    public function getTablesDescriptionAction(): void
    {
        $this->view->data = $this->getTablesDescription();
    }

    public function getNewRecordsAction(): void
    {
        $currentPage                 = $this->request->getPost('draw');
        $table                       = $this->request->get('table');
        $this->view->draw            = $currentPage;
        $this->view->recordsTotal    = 0;
        $this->view->recordsFiltered = 0;
        $this->view->data            = [];

        $descriptions = $this->getTablesDescription();
        if(!isset($descriptions[$table])){
            return;
        }
        $className = $this->getClassName($table);
        if(!empty($className)){
            $filter = [];
            if(isset($descriptions[$table]['cols']['priority'])){
                $filter = ['order' => 'priority'];
            }
            $allRecords = $className::find($filter)->toArray();
            $records    = [];
            $emptyRow   = [
                'rowIcon'  =>  $descriptions[$table]['cols']['rowIcon']['icon']??'',
                'DT_RowId' => 'TEMPLATE'
            ];
            foreach ($descriptions[$table]['cols'] as $key => $metadata) {
                if('rowIcon' !== $key){
                    $emptyRow[$key] = '';
                }
            }
            $records[] = $emptyRow;
            foreach ($allRecords as $rowData){
                $tmpData = [];
                $tmpData['DT_RowId'] =  $rowData['id'];
                foreach ($descriptions[$table]['cols'] as $key => $metadata){
                    if('rowIcon' === $key){
                        $tmpData[$key] = $metadata['icon']??'';
                    }elseif('delButton' === $key){
                        $tmpData[$key] = '';
                    }elseif(isset($rowData[$key])){
                        $tmpData[$key] =  $rowData[$key];
                    }
                }
                $records[] = $tmpData;
            }
            $this->view->data      = $records;
        }
    }

    /**
     * Index page controller
     */
    public function indexAction(): void
    {
        $footerCollection = $this->assets->collection('footerJS');
        $footerCollection->addJs('js/pbx/main/form.js', true);
        $footerCollection->addJs('js/vendor/datatable/dataTables.semanticui.js', true);
        $footerCollection->addJs("js/cache/{$this->moduleUniqueID}/module-telegram-provider-index.js", true);
        $footerCollection->addJs('js/vendor/jquery.tablednd.min.js', true);
        $footerCollection->addJs('js/vendor/semantic/modal.min.js', true);
        $footerCollection->addJs('js/vendor/clipboard/clipboard.js', true);

        $headerCollectionCSS = $this->assets->collection('headerCSS');
        $headerCollectionCSS->addCss("css/cache/{$this->moduleUniqueID}/module-telegram-provider.css", true);
        $headerCollectionCSS->addCss('css/vendor/datatable/dataTables.semanticui.min.css', true);
        $headerCollectionCSS->addCss('css/vendor/semantic/modal.min.css', true);

        $settings = ModuleTelegramProvider::findFirst();
        if ($settings === null) {
            $settings = new ModuleTelegramProvider();
        }
        $options = [];
        $this->view->form = new ModuleTelegramProviderForm($settings, $options);
        $this->view->pick("{$this->moduleDir}/App/Views/index");
    }

    /**
     * Save settings AJAX action
     */
    public function saveAction() :void
    {
        $data       = $this->request->getPost();
        $record = ModuleTelegramProvider::findFirst();
        if ($record === null) {
            $record = new ModuleTelegramProvider();
        }
        $this->db->begin();
        foreach ($record as $key => $value) {
            if($key !== 'id' && array_key_exists($key, $data)){
                $record->$key = $data[$key];
            }
        }
        if ($record->save() === FALSE) {
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();
            return;
        }
        $records = ModuleTelegramProvider::find();
        foreach ($records as $rowData){
            $rowData->api_id    = $record->api_id;
            $rowData->api_hash  = $record->api_hash;
            $rowData->save();
        }
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }

    /**
     * Delete phonebook record
     */
    public function deleteAction(): void
    {
        $table     = $this->request->get('table');
        $className = $this->getClassName($table);
        if(empty($className)) {
            $this->view->success = false;
            return;
        }
        $id     = $this->request->get('id');
        $count = 0;
        if(ModuleTelegramProvider::class === $className){
            $allData = $className::find()->toArray();
            $count = count($allData);
        }
        $record = $className::findFirstById($id);
        if($count === 1){
            $record->phone_number = '';
            $result = $record->save();
        }else{
            $result = $record->delete();
        }
        if ($record !== null && $result === false) {
            $this->flash->error(implode('<br>', $record->getMessages()));
            $this->view->success = false;
            return;
        }
        $this->view->success = true;
    }

    /**
     * Возвращает метаданные таблицы.
     * @return array
     */
    private function getTablesDescription():array
    {
        $description['ModuleTelegramProvider'] = [
            'cols' => [
                'rowIcon'       => ['header' => '',                        'class' => 'collapsing', 'icon' => 'paper plane outline'],
                'phone_number'  => ['header' => '',                        'class' => ''],
                'delButton'     => ['header' => '',                        'class' => 'collapsing']
            ],
            'ajaxUrl' => '/getNewRecords',
            'needDelButton' => true
        ];
        return $description;
    }

    /**
     * Обновление данных в таблице.
     */
    public function saveTableDataAction():void
    {
        $data       = $this->request->getPost();
        $tableName  = $data['pbx-table-id']??'';

        $className = $this->getClassName($tableName);
        if(empty($className)){
            return;
        }
        $rowId      = $data['pbx-row-id']??'';
        if(empty($rowId)){
            $this->view->success = false;
            return;
        }
        $this->db->begin();

        /** @var $rowData */
        $rowData = $className::findFirst('id="'.$rowId.'"');
        if(!$rowData){
            $rowData = new $className();
        }
        foreach ($rowData as $key => $value) {
            if($key === 'id'){
                continue;
            }
            if (array_key_exists($key, $data)) {
                $rowData->writeAttribute($key, $data[$key]);
            }
        }

        if($className === ModuleTelegramProvider::class){
            $rowOldData = $className::findFirst('api_id<>"" AND api_id IS NOT NULL');
//            $rowOldData->setHydrateMode(
//                Resultset::HYDRATE_OBJECTS
//            );
            if($rowData){
                $rowData->api_id    = $rowOldData->api_id;
                $rowData->api_hash  = $rowOldData->api_hash;
            }
        }

        // save action
        if ($rowData->save() === FALSE) {
            $errors = $rowData->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();
            return;
        }
        $this->view->data = ['pbx-row-id'=>$rowId, 'newId'=>$rowData->id, 'pbx-table-id' => $data['pbx-table-id']];
        $this->view->success = true;
        $this->db->commit();

    }

    /**
     * Получение имени класса по имени таблицы
     * @param $tableName
     * @return string
     */
    private function getClassName($tableName):string
    {
        if(empty($tableName)){
            return '';
        }
        $className = "Modules\ModuleTelegramProvider\Models\\$tableName";
        if(!class_exists($className)){
            $className = '';
        }
        return $className;
    }

    /**
     * Changes rules priority
     *
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        $result = true;

        if ( ! $this->request->isPost()) {
            return;
        }
        $priorityTable = $this->request->getPost();
        $tableName     = $this->request->get('table');
        $className = $this->getClassName($tableName);
        if(empty($className)){
            echo "table not found -- ы$tableName --";
            return;
        }
        $rules = $className::find();
        foreach ($rules as $rule){
            if (array_key_exists ( $rule->id, $priorityTable)){
                $rule->priority = $priorityTable[$rule->id];
                $result         .= $rule->update();
            }
        }
        echo json_encode($result);
    }
}