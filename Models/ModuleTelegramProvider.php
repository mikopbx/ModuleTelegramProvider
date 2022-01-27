<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2019
 */

/*
 * https://docs.phalcon.io/4.0/en/db-models
 *
 */

namespace Modules\ModuleTelegramProvider\Models;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Modules\Models\ModulesModelsBase;
use Phalcon\Mvc\Model\Relation;

class ModuleTelegramProvider extends ModulesModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     *
     * @Column(type="string", nullable=true)
     */
    public $api_id = '';

    /**
     *
     * @Column(type="string", nullable=true)
     */
    public $api_hash = '';

    /**
     *
     * @Column(type="string", nullable=true)
     */
    public $phone_number = '';

    /**
     *
     * @Column(type="integer", nullable=true)
     */
    public $priority = '0';

    /**
     *
     * @Column(type="integer", nullable=true)
     */
    public $disable = '0';

    /**
     * Returns dynamic relations between module models and common models
     * MikoPBX check it in ModelsBase after every call to keep data consistent
     *
     * There is example to describe the relation between Providers and ModuleTelegramProvider models
     *
     * It is important to duplicate the relation alias on message field after Models\ word
     *
     * @param $calledModelObject
     *
     * @return void
     */
    public static function getDynamicRelations(&$calledModelObject): void
    {
    }

    public function initialize(): void
    {
        $this->setSource('m_ModuleTelegramProvider');
        parent::initialize();
    }
}