<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2018
 *
 */
namespace Modules\ModuleTelegramProvider\App\Forms;

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;


class ModuleTelegramProviderForm extends Form
{

    public function initialize($entity = null, $options = null) :void
    {

        // id
        $this->add(new Hidden('id', ['value' => $entity->id]));
        // text_field
        $this->add(new Text('phone_number'));
        $this->add(new Text('api_id'));
        $this->add(new Password('api_hash'));
        $this->add(new Text('botId'));

        $this->add(new TextArea('businessCardText', ['rows' => 2]));
        $this->add(new TextArea('keyboardText', ['rows' => 2]));
        $this->add(new TextArea('autoAnswerText', ['rows' => 2]));

        $queues = new Select('callbackQueue', $options['queues'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => true,
            'class'    => 'ui selection dropdown provider-select',
        ]);
        $this->add($queues);
    }
}